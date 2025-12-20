#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::env;
use serde_json::Value;
use tauri::{AppHandle, Manager};

/// Get the installation directory (where the exe is located)
fn get_install_dir() -> PathBuf {
    env::current_exe()
        .expect("failed to get current exe path")
        .parent()
        .expect("failed to get parent directory")
        .to_path_buf()
}

/// Get the data directory (../data relative to exe)
fn get_data_dir() -> PathBuf {
    let mut dir = get_install_dir();
    dir.push("data");
    
    // Create the data directory if it doesn't exist
    fs::create_dir_all(&dir).ok();
    
    dir
}

/// Get the path for user-writable data (owned.json)
fn get_user_data_file(_app: &AppHandle) -> PathBuf {
    let mut dir = get_data_dir();
    dir.push("owned.json");
    dir
}

/// Get the path for custom drop data (custom-drops.json)
fn get_custom_drops_file(_app: &AppHandle) -> Option<PathBuf> {
    let mut path = get_data_dir();
    path.push("custom-drops.json");
    
    // Create example template if it doesn't exist
    if !path.exists() {
        let example_content = serde_json::json!({
            "Arcane Defense": {
                "drops": [{
                    "location": "???",
                    "chance": 0.0,
                    "rarity": "???",
                    "type": "Arcane Defense"
                }]
            },
            "Arcane Detoxifier": {
                "drops": [{
                    "location": "???",
                    "chance": 0.0,
                    "rarity": "???",
                    "type": "Arcane Detoxifier"
                }]
            },
            "Arcane Liquid": {
                "drops": [{
                    "location": "???",
                    "chance": 0.0,
                    "rarity": "???",
                    "type": "Arcane Liquid"
                }]
            },
            "Arcane Protection": {
                "drops": [{
                    "location": "???",
                    "chance": 0.0,
                    "rarity": "???",
                    "type": "Arcane Protection"
                }]
            },
            "Arcane Shield": {
                "drops": [{
                    "location": "???",
                    "chance": 0.0,
                    "rarity": "???",
                    "type": "Arcane Shield"
                }]
            },
            "Arcane Survival": {
                "drops": [{
                    "location": "???",
                    "chance": 0.0,
                    "rarity": "???",
                    "type": "Arcane Survival"
                }]
            },
            "Arcane Temperance": {
                "drops": [{
                    "location": "???",
                    "chance": 0.0,
                    "rarity": "???",
                    "type": "Arcane Temperance"
                }]
            },
            "Pax Bolt": {
                "drops": [{
                    "location": "Solaris United (Rude Zuud), Old Mate",
                    "chance": 1.0,
                    "rarity": "Common",
                    "type": "Pax Bolt"
                }]
            },
            "Pax Charge": {
                "drops": [{
                    "location": "Solaris United (Rude Zuud), Old Mate",
                    "chance": 1.0,
                    "rarity": "Common",
                    "type": "Pax Charge"
                }]
            },
            "Pax Soar": {
                "drops": [{
                    "location": "Solaris United (Rude Zuud), Old Mate",
                    "chance": 1.0,
                    "rarity": "Common",
                    "type": "Pax Soar"
                }]
            }
        });
        
        if let Ok(json_str) = serde_json::to_string_pretty(&example_content) {
            if fs::write(&path, json_str).is_ok() {
                println!("Created custom-drops.json at: {:?}", path);
            }
        }
    }
    
    if path.exists() {
        println!("Using custom drops from: {:?}", path);
        Some(path)
    } else {
        println!("No custom drops file found");
        None
    }
}

#[tauri::command]
fn load_owned(app: AppHandle) -> Value {
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
fn save_owned(app: AppHandle, data: Value) -> Result<String, String> {
    let file = get_user_data_file(&app);
    
    println!("Saving to: {:?}", file);
    
    fs::write(&file, serde_json::to_string_pretty(&data).unwrap())
        .map_err(|e| format!("Failed to save: {}", e))?;
    
    Ok(format!("Saved to {:?}", file))
}

#[tauri::command]
fn load_custom_drops(app: AppHandle) -> Value {
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

/// Get the data directory path for display to users
#[tauri::command]
fn get_data_path(_app: AppHandle) -> String {
    get_data_dir()
        .to_string_lossy()
        .to_string()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_owned, 
            save_owned, 
            load_custom_drops,
            get_data_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}