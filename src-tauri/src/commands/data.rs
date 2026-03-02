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

/// Get the data directory path for display to users
#[tauri::command]
pub fn get_data_path(_app: AppHandle) -> String {
    get_data_dir()
        .to_string_lossy()
        .to_string()
}

/// Unified image cache for all modules (arcanes, primes, mastery).
/// Stores uniqueName → base64 data URI, persisted to shared_image_cache.json.
#[tauri::command]
pub fn load_shared_image_cache() -> Result<HashMap<String, String>, String> {
    let path = get_data_dir().join("shared_image_cache.json");
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_shared_image_cache(cache: HashMap<String, String>) -> Result<(), String> {
    let path = get_data_dir().join("shared_image_cache.json");
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