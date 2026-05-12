use std::fs;
use serde_json::Value;
use tauri::AppHandle;
use std::collections::HashMap;
use reqwest;
use base64::{Engine as _, engine::general_purpose};
use crate::utils::{get_user_data_file, get_custom_drops_file, get_data_dir};

#[tauri::command]
pub fn load_owned(app: AppHandle) -> Value {
    let file = get_user_data_file(&app);

    println!("Loading owned data from: {:?}", file);

    if !file.exists() {
        let default = serde_json::json!({ "owned": {} });
        fs::write(&file, serde_json::to_string_pretty(&default).unwrap()).unwrap();
        return default;
    }

    let data = fs::read_to_string(&file).unwrap_or_else(|e| {
        eprintln!("Error reading file: {}", e);
        r#"{ "owned": {} }"#.to_string()
    });

    serde_json::from_str(&data).unwrap_or_else(|e| {
        eprintln!("Error parsing JSON: {}", e);
        serde_json::json!({ "owned": {} })
    })
}

#[tauri::command]
pub fn save_owned(app: AppHandle, data: Value) -> Result<String, String> {
    let file = get_user_data_file(&app);

    println!("Saving to: {:?}", file);

    fs::write(&file, serde_json::to_string_pretty(&data).unwrap())
        .map_err(|e| format!("Failed to save: {}", e))?;

    Ok(format!("Saved to {:?}", file))
}

#[tauri::command]
pub fn load_custom_drops(app: AppHandle) -> Value {
    if let Some(file) = get_custom_drops_file(&app) {
        match fs::read_to_string(&file) {
            Ok(data) => {
                println!("Loaded custom drops from: {:?}", file);
                serde_json::from_str(&data).unwrap_or_else(|e| {
                    eprintln!("Error parsing custom drops JSON: {}", e);
                    serde_json::json!({})
                })
            }
            Err(e) => {
                eprintln!("Error reading custom drops file: {}", e);
                serde_json::json!({})
            }
        }
    } else {
        serde_json::json!({})
    }
}

#[tauri::command]
pub async fn fetch_image_base64(url: String) -> Result<String, String> {
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    Ok(base64::encode(&bytes))
}

/// Proxy an external JSON GET request through Rust to avoid CORS restrictions
/// in the Tauri webview. Optionally accepts request headers as key-value pairs.
/// Returns the raw JSON body as a serde_json::Value.
#[tauri::command]
pub async fn fetch_json(
    url: String,
    headers: Option<HashMap<String, String>>,
) -> Result<Value, String> {
    // Build client with browser-like TLS and automatic decompression
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .gzip(true)
        .brotli(true)
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;
    
    let mut req = client.get(&url);
    
    // Add standard browser headers
    req = req
        .header("Accept", "application/json, text/plain, */*")
        .header("Accept-Language", "en-US,en;q=0.9")
        .header("Accept-Encoding", "gzip, deflate, br")
        .header("Cache-Control", "no-cache")
        .header("Pragma", "no-cache")
        .header("Sec-Ch-Ua", "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"")
        .header("Sec-Ch-Ua-Mobile", "?0")
        .header("Sec-Ch-Ua-Platform", "\"Windows\"")
        .header("Sec-Fetch-Dest", "empty")
        .header("Sec-Fetch-Mode", "cors")
        .header("Sec-Fetch-Site", "cross-site")
        .header("Referer", "https://warframe.market/");
    
    if let Some(hdrs) = headers {
        for (key, val) in hdrs {
            req = req.header(&key, &val);
        }
    }
    
    let response = req.send().await.map_err(|e| {
        if e.is_connect() {
            format!("Connection failed: {}. Please check your internet connection.", e)
        } else if e.is_timeout() {
            "Request timed out. Please try again.".to_string()
        } else {
            format!("Request failed: {}", e)
        }
    })?;
    
    let status = response.status();
    
    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status.as_u16(), status.canonical_reason().unwrap_or("Unknown error")));
    }
    
    // Get the response bytes - reqwest automatically decompresses based on Content-Encoding
    let body_bytes = response.bytes().await.map_err(|e| format!("Failed to read response body: {}", e))?;
    
    // Parse JSON directly from bytes - this is the safest approach
    match serde_json::from_slice(&body_bytes) {
        Ok(json) => Ok(json),
        Err(json_err) => {
            // Try to check if it's HTML (Cloudflare challenge)
            // Only attempt to convert to string if it looks like valid UTF-8
            if let Ok(body_str) = std::str::from_utf8(&body_bytes) {
                if body_str.contains("Just a moment...") || 
                   body_str.contains("cf_chl") || 
                   (body_str.contains("<html") && body_str.len() < 10000) {
                    return Err("Market API is protected by Cloudflare. Please try again later.".to_string());
                }
                // Provide preview for debugging (safe char iteration, not byte slicing)
                let preview: String = body_str.chars().take(200).collect();
                eprintln!("fetch_json parse error for {}: {}\nResponse preview: {}", url, json_err, preview);
            } else {
                // Response is not valid UTF-8 - likely compressed or binary
                eprintln!("fetch_json parse error for {}: {} (response is not valid UTF-8)", url, json_err);
            }
            
            Err(format!("Invalid JSON response from server: {}", json_err))
        }
    }
}

/// Get the data directory path for display to users
#[tauri::command]
pub fn get_data_path(_app: AppHandle) -> String {
    get_data_dir()
        .to_string_lossy()
        .to_string()
}

/// Per-module image caches — each section loads only its own file.
/// Stores uniqueName → base64 data URI.

#[tauri::command]
pub fn load_primes_image_cache() -> Result<HashMap<String, String>, String> {
    let path = get_data_dir().join("primes_image_cache.json");
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_primes_image_cache(cache: HashMap<String, String>) -> Result<(), String> {
    let path = get_data_dir().join("primes_image_cache.json");
    let content = serde_json::to_string_pretty(&cache).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_mastery_image_cache() -> Result<HashMap<String, String>, String> {
    let path = get_data_dir().join("mastery_image_cache.json");
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_mastery_image_cache(cache: HashMap<String, String>) -> Result<(), String> {
    let path = get_data_dir().join("mastery_image_cache.json");
    let content = serde_json::to_string_pretty(&cache).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

/// Mastery item data cache — stores the full normalized item list with a
/// timestamp so the loader can skip network fetches when the cache is fresh.
/// Shape: { "cachedAt": "<ISO timestamp>", "items": [...] }
#[tauri::command]
pub fn load_mastery_data_cache() -> Result<Value, String> {
    let path = get_data_dir().join("mastery_data_cache.json");
    if !path.exists() {
        return Ok(Value::Null);
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_mastery_data_cache(data: Value) -> Result<(), String> {
    let path = get_data_dir().join("mastery_data_cache.json");
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_wm_map_cache() -> Result<Value, String> {
    let path = get_data_dir().join("wm_map_cache.json");
    if !path.exists() {
        return Ok(Value::Null);
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_wm_map_cache(data: Value) -> Result<(), String> {
    let path = get_data_dir().join("wm_map_cache.json");
    eprintln!("save_wm_map_cache writing to: {:?}", path);
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| {
        eprintln!("save_wm_map_cache write error: {e}");
        e.to_string()
    })
}

#[tauri::command]
pub fn load_resurgence_cache() -> Result<Value, String> {
    let path = get_data_dir().join("resurgence_cache.json");
    if !path.exists() { return Ok(Value::Null); }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_resurgence_cache(data: Value) -> Result<(), String> {
    let path = get_data_dir().join("resurgence_cache.json");
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}