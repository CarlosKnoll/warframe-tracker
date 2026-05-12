// src-tauri/src/commands/market.rs
//
// Warframe Market v2 API — full order dump parser.
//
// Actual response shape (confirmed via console inspection):
//   { "apiVersion": "...", "error": null, "data": { "0": {...}, "1": {...}, ... } }
//
// `data` is a JSON *object* with numeric string keys, NOT an array and NOT a
// { sell: [], buy: [] } structure. Every order object sits directly under `data`
// and carries a "type" field whose value is "sell" or "buy".
//
// Strategy: stream chunk-by-chunk, detect the "data":{ key once to enter parsing
// mode, then use a brace-depth tracker to extract each top-level order object.
// Parse "type", "platinum", and "user.status" from each object, route active
// orders to two BinaryHeaps (max-heap for sell to keep N cheapest, min-heap for
// buy to keep N most expensive), drain and sort at the end.
//
// Also filters out orders where "visible" is false.

use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, USER_AGENT};
use futures_util::StreamExt;
use std::collections::BinaryHeap;
use std::cmp::Ordering;
use tauri::command;

// ── Public types ─────────────────────────────────────────────────────────────

#[derive(Debug, serde::Serialize, Clone)]
pub struct CompactOrder {
    pub id: String,
    pub platinum: u32,
    pub quantity: u32,
    pub rank: u8,
    pub user_name: String,
    pub status: String,
    pub order_type: String,
}

#[derive(Debug, serde::Serialize)]
pub struct MarketStreamResult {
    pub new_sell_orders: Vec<CompactOrder>,
    pub new_buy_orders: Vec<CompactOrder>,
    pub stopped_reason: String,
    pub total_processed: usize,
    pub ingame_count: usize,
}

// ── Heap wrappers ─────────────────────────────────────────────────────────────
//
// Sell: max-heap on platinum — evict most expensive when len > N, keeping N cheapest.
// Buy:  min-heap on platinum — evict cheapest when len > N, keeping N most expensive.

#[derive(Clone)]
struct SellEntry(CompactOrder);

impl PartialEq for SellEntry {
    fn eq(&self, other: &Self) -> bool { self.0.platinum == other.0.platinum }
}
impl Eq for SellEntry {}
impl PartialOrd for SellEntry {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> { Some(self.cmp(other)) }
}
impl Ord for SellEntry {
    fn cmp(&self, other: &Self) -> Ordering {
        self.0.platinum.cmp(&other.0.platinum) // max-heap
    }
}

#[derive(Clone)]
struct BuyEntry(CompactOrder);

impl PartialEq for BuyEntry {
    fn eq(&self, other: &Self) -> bool { self.0.platinum == other.0.platinum }
}
impl Eq for BuyEntry {}
impl PartialOrd for BuyEntry {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> { Some(self.cmp(other)) }
}
impl Ord for BuyEntry {
    fn cmp(&self, other: &Self) -> Ordering {
        other.0.platinum.cmp(&self.0.platinum) // min-heap
    }
}

// ── Command ───────────────────────────────────────────────────────────────────

#[command]
pub async fn fetch_market_orders_stream(
    url: String,
    target_sell_count: usize,
    target_buy_count: usize,
    rank_filter: Option<u8>,  // None = no filter; Some(n) = only orders where rank == n
) -> Result<MarketStreamResult, String> {
    let client = reqwest::Client::builder()
        .user_agent("WarframeCollectionTracker/1.0")
        .timeout(std::time::Duration::from_secs(60))
        .gzip(true)
        .brotli(true)
        .build()
        .map_err(|e| format!("Client build failed: {}", e))?;

    let mut headers = HeaderMap::new();
    headers.insert(ACCEPT, HeaderValue::from_static("application/json"));
    headers.insert(USER_AGENT, HeaderValue::from_static("WarframeCollectionTracker/1.0"));
    headers.insert(
        reqwest::header::ACCEPT_ENCODING,
        HeaderValue::from_static("gzip, deflate, br"),
    );
    // Tell the API we're on PC with crossplay enabled so it returns orders from
    // all platforms (PC + cross-save console players), not just native PC.
    headers.insert(
        reqwest::header::HeaderName::from_static("platform"),
        HeaderValue::from_static("pc"),
    );
    headers.insert(
        reqwest::header::HeaderName::from_static("crossplay"),
        HeaderValue::from_static("true"),
    );

    let response = client
        .get(&url)
        .headers(headers)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "HTTP {}: {}",
            response.status(),
            response.status().canonical_reason().unwrap_or("Unknown")
        ));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::with_capacity(1024 * 1024);

    let mut sell_heap: BinaryHeap<SellEntry> = BinaryHeap::new();
    let mut buy_heap: BinaryHeap<BuyEntry> = BinaryHeap::new();

    let mut total_processed: usize = 0;
    let mut ingame_count: usize = 0;

    // Parser state.
    // Phase 0: scanning for the "data":[ key.
    // Phase 1: inside the data array, extracting order objects by brace depth.
    // The actual response shape is: {"apiVersion":...,"data":[{order},{order},...]}
    let mut in_data = false;
    let mut in_object = false;
    let mut object_start: usize = 0;
    let mut brace_depth: u32 = 0;
    // `cursor` persists across chunks so we never re-scan already-processed bytes.
    // The buffer is only cleared between objects; when mid-object we append and
    // resume from where we left off.
    let mut cursor: usize = 0;

    'stream: while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
        let chunk_len = chunk.len();
        let buf_before = buffer.len();
        buffer.push_str(&String::from_utf8_lossy(&chunk));
        eprintln!("[market] chunk bytes={} buf_before={} buf_after={} cursor={}", chunk_len, buf_before, buffer.len(), cursor);

        let mut i = cursor;
        let mut objects_this_chunk = 0usize;

        while i < buffer.len() {
            let ch = buffer.as_bytes()[i] as char;

            if !in_data {
                // Scan for "data":[ — the opening of the orders array.
                if buffer[i..].starts_with("\"data\":[") {
                    in_data = true;
                    eprintln!("[market] found data:[ at i={}", i);
                    i += 8; // skip `"data":[`
                    continue;
                }
                i += 1;
                continue;
            }

            // ── Inside the data array ─────────────────────────────────────

            if !in_object {
                if ch == '{' {
                    // Start of a new order object.
                    in_object = true;
                    object_start = i;
                    brace_depth = 1;
                } else if ch == ']' {
                    // End of the data array — no more orders.
                    eprintln!("[market] hit ] at i={}, breaking", i);
                    break 'stream;
                }
                i += 1;
                continue;
            }

            // ── Inside an order object ────────────────────────────────────

            if ch == '{' {
                brace_depth += 1;
            } else if ch == '}' {
                brace_depth -= 1;
                if brace_depth == 0 {
                    let obj_str = &buffer[object_start..=i];

                    if let Some(order) = parse_order(obj_str) {
                        total_processed += 1;

                        if order.status == "ingame" {
                            ingame_count += 1;
                        }

                        let is_active = order.status == "ingame" || order.status == "online";

                        // Apply rank filter if requested.
                        let passes_rank = match rank_filter {
                            Some(required_rank) => order.rank == required_rank,
                            None => true,
                        };

                        if is_active && passes_rank {
                            if order.order_type == "sell" && target_sell_count > 0 {
                                sell_heap.push(SellEntry(order));
                                if sell_heap.len() > target_sell_count {
                                    sell_heap.pop();
                                }
                            } else if order.order_type == "buy" && target_buy_count > 0 {
                                buy_heap.push(BuyEntry(order));
                                if buy_heap.len() > target_buy_count {
                                    buy_heap.pop();
                                }
                            }
                        }
                    }

                    objects_this_chunk += 1;
                    in_object = false;
                }
            }

            i += 1;
        }

        eprintln!("[market] chunk done: objects_this_chunk={} total_processed={} i={} buf_len={} in_object={} in_data={}", 
            objects_this_chunk, total_processed, i, buffer.len(), in_object, in_data);

        // Buffer + cursor management.
        // Mid-object: leave buffer intact (object_start and brace_depth are live
        // pointers into it), update cursor so next chunk resumes after last byte read.
        // Between objects: inner loop reached buf end, nothing left — clear buffer
        // and reset cursor to 0 so next chunk starts fresh.
        if in_object {
            cursor = i; // resume here after next chunk appends
        } else {
            buffer.clear();
            object_start = 0;
            cursor = 0;
        }
    }

    let mut sell_orders: Vec<CompactOrder> = sell_heap.into_iter().map(|e| e.0).collect();
    sell_orders.sort_by_key(|o| o.platinum);

    let mut buy_orders: Vec<CompactOrder> = buy_heap.into_iter().map(|e| e.0).collect();
    buy_orders.sort_by(|a, b| b.platinum.cmp(&a.platinum));

    let sell_len = sell_orders.len();
    let buy_len = buy_orders.len();

    Ok(MarketStreamResult {
        new_sell_orders: sell_orders,
        new_buy_orders: buy_orders,
        stopped_reason: format!(
            "Full dump parsed. Processed {} orders. Returning {} cheapest sellers, {} highest buyers.",
            total_processed, sell_len, buy_len
        ),
        total_processed,
        ingame_count,
    })
}

// ── Parser ────────────────────────────────────────────────────────────────────
//
// Use serde_json to parse each extracted object string. This is unambiguous —
// no risk of matching "type" inside a nested object, no string-scanning bugs.
// The brace-depth boundary extraction in the stream loop above guarantees we
// pass a complete, valid JSON object here every time.

#[derive(serde::Deserialize)]
struct RawOrder {
    id: String,
    #[serde(rename = "type")]
    order_type: String,
    platinum: u32,
    quantity: Option<u32>,
    rank: Option<u8>,
    visible: Option<bool>,
    user: RawUser,
}

#[derive(serde::Deserialize)]
struct RawUser {
    #[serde(rename = "ingameName")]
    ingame_name: Option<String>,
    slug: Option<String>,
    status: Option<String>,
}

fn parse_order(obj_str: &str) -> Option<CompactOrder> {
    eprintln!("[market] raw obj: {}", &obj_str[..obj_str.len().min(300)]);  // ← add this
    
    let raw: RawOrder = serde_json::from_str(obj_str).ok()?;

    // Skip invisible orders.
    if raw.visible == Some(false) {
        return None;
    }

    // Only process known order types.
    if raw.order_type != "sell" && raw.order_type != "buy" {
        return None;
    }

    let user_name = raw.user.ingame_name
        .or(raw.user.slug)
        .unwrap_or_default();

    if raw.id.is_empty() || user_name.is_empty() {
        return None;
    }

    Some(CompactOrder {
        id: raw.id,
        platinum: raw.platinum,
        quantity: raw.quantity.unwrap_or(1),
        rank: raw.rank.unwrap_or(0),
        user_name,
        status: raw.user.status.unwrap_or_default(),
        order_type: raw.order_type,
    })
}