// src-tauri/src/commands/oauth.rs
//
// One-shot loopback HTTP listener for the OAuth callback.
// No extra crate needed — tokio is already a transitive Tauri dependency.
//
// Add to src-tauri/Cargo.toml:
//   tokio = { version = "1", features = ["net", "io-util", "rt", "macros"] }

use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

#[derive(Clone, serde::Serialize)]
struct OAuthCodePayload {
    code:  Option<String>,
    error: Option<String>,
}

/// Binds a one-shot HTTP listener on 127.0.0.1 and returns the bound port.
/// When Google redirects back with ?code=…, the code is emitted as the
/// `oauth://code` event and a human-readable page is served to the browser.
#[tauri::command]
pub async fn start_oauth_listener(app: AppHandle) -> Result<u16, String> {
    // Port 0 lets the OS pick a free port — no collisions possible.
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Failed to bind OAuth listener: {e}"))?;

    let port = listener
        .local_addr()
        .map_err(|e| e.to_string())?
        .port();

    tokio::spawn(async move {
        let payload = match listener.accept().await {
            Err(e) => {
                eprintln!("[oauth] Accept error: {e}");
                OAuthCodePayload { code: None, error: Some(e.to_string()) }
            }
            Ok((mut stream, _)) => {
                let mut buf = vec![0u8; 8192];
                let n = match stream.read(&mut buf).await {
                    Ok(n)  => n,
                    Err(e) => {
                        eprintln!("[oauth] Read error: {e}");
                        let _ = app.emit("oauth://code", OAuthCodePayload {
                            code: None, error: Some(e.to_string()),
                        });
                        return;
                    }
                };

                let request   = String::from_utf8_lossy(&buf[..n]);
                let first_line = request.lines().next().unwrap_or("");
                let (code, error) = parse_oauth_params(first_line);

                let html = if error.is_none() {
                    "<!DOCTYPE html><html><head>\
                     <meta charset='utf-8'>\
                     <style>body{margin:0;display:flex;align-items:center;justify-content:center;\
                     height:100vh;background:#0c0f16;color:#e5e9f0;font-family:sans-serif;text-align:center}\
                     h2{margin-bottom:.5rem}p{opacity:.6;font-size:.9rem}</style>\
                     </head><body>\
                     <div><h2>&#x2705; Signed in!</h2>\
                     <p>You can close this tab and return to Warframe Tracker.</p></div>\
                     <script>window.close();</script>
                     </body></html>"
                } else {
                    "<!DOCTYPE html><html><head>\
                     <meta charset='utf-8'>\
                     <style>body{margin:0;display:flex;align-items:center;justify-content:center;\
                     height:100vh;background:#0c0f16;color:#e5e9f0;font-family:sans-serif;text-align:center}\
                     h2{margin-bottom:.5rem}p{opacity:.6;font-size:.9rem}</style>\
                     </head><body>\
                     <div><h2>&#x274C; Sign-in failed</h2>\
                     <p>Something went wrong. Please try again inside the app.</p></div>\
                     </body></html>"
                };

                let response = format!(
                    "HTTP/1.1 200 OK\r\n\
                     Content-Type: text/html; charset=utf-8\r\n\
                     Content-Length: {}\r\n\
                     Connection: close\r\n\
                     \r\n{}",
                    html.len(), html
                );

                let _ = stream.write_all(response.as_bytes()).await;
                let _ = stream.flush().await;
                drop(stream); // close connection before emitting so browser renders first

                OAuthCodePayload { code, error }
            }
        };

        let _ = app.emit("oauth://code", payload);
    });

    Ok(port)
}

/// Extracts `code` and `error` from the first line of an HTTP GET request.
/// e.g. "GET /oauth/callback?code=4%2Fabc&scope=… HTTP/1.1"
fn parse_oauth_params(request_line: &str) -> (Option<String>, Option<String>) {
    let path = request_line
        .strip_prefix("GET ")
        .and_then(|s| s.split_once(" HTTP").map(|(p, _)| p))
        .unwrap_or("");

    let query = path.split_once('?').map(|(_, q)| q).unwrap_or("");

    let mut code  = None;
    let mut error = None;

    for pair in query.split('&') {
        if let Some((k, v)) = pair.split_once('=') {
            match k {
                "code"  => code  = Some(percent_decode(v)),
                "error" => error = Some(percent_decode(v)),
                _ => {}
            }
        }
    }

    if code.is_none() && error.is_none() {
        error = Some("No code in callback".into());
    }

    (code, error)
}

fn percent_decode(s: &str) -> String {
    let mut out   = String::with_capacity(s.len());
    let mut bytes = s.bytes().peekable();
    while let Some(b) = bytes.next() {
        if b == b'%' {
            let h1 = bytes.next();
            let h2 = bytes.next();
            if let (Some(a), Some(b2)) = (h1, h2) {
                if let Ok(byte) = u8::from_str_radix(
                    &format!("{}{}", a as char, b2 as char), 16
                ) {
                    out.push(byte as char);
                    continue;
                }
            }
        } else if b == b'+' {
            out.push(' ');
        } else {
            out.push(b as char);
        }
    }
    out
}
