use std::fs;
use std::path::PathBuf;
use std::env;
use tauri::AppHandle;
use log;

/// Get the installation directory (where the exe is located)
pub fn get_install_dir() -> PathBuf {
    env::current_exe()
        .expect("failed to get current exe path")
        .parent()
        .expect("failed to get parent directory")
        .to_path_buf()
}

/// Get the data directory (../data relative to exe)
pub fn get_data_dir() -> PathBuf {
    let mut dir = get_install_dir();
    dir.push("data");

    // Create the data directory if it doesn't exist
    fs::create_dir_all(&dir).ok();

    dir
}

/// Get the path for user-writable data (owned.json)
pub fn get_user_data_file(_app: &AppHandle) -> PathBuf {
    let mut dir = get_data_dir();
    dir.push("owned.json");
    dir
}

/// Get the path for custom drop data (custom-drops.json)
pub fn get_custom_drops_file(_app: &AppHandle) -> Option<PathBuf> {
    let mut path = get_data_dir();
    path.push("custom-drops.json");

    // Create example template if it doesn't exist
    if !path.exists() {
        let example_content = serde_json::json!({
            "Arcane Defense": {
                "drops": [{ "location": "???", "chance": 0.0, "rarity": "???", "type": "Arcane Defense" }]
            },
            "Arcane Detoxifier": {
                "drops": [{ "location": "???", "chance": 0.0, "rarity": "???", "type": "Arcane Detoxifier" }]
            },
            "Arcane Liquid": {
                "drops": [{ "location": "???", "chance": 0.0, "rarity": "???", "type": "Arcane Liquid" }]
            },
            "Arcane Protection": {
                "drops": [{ "location": "???", "chance": 0.0, "rarity": "???", "type": "Arcane Protection" }]
            },
            "Arcane Shield": {
                "drops": [{ "location": "???", "chance": 0.0, "rarity": "???", "type": "Arcane Shield" }]
            },
            "Arcane Survival": {
                "drops": [{ "location": "???", "chance": 0.0, "rarity": "???", "type": "Arcane Survival" }]
            },
            "Arcane Temperance": {
                "drops": [{ "location": "???", "chance": 0.0, "rarity": "???", "type": "Arcane Temperance" }]
            },
            "Pax Bolt": {
                "drops": [{ "location": "Solaris United (Rude Zuud), Old Mate", "chance": 1.0, "rarity": "Common", "type": "Pax Bolt" }]
            },
            "Pax Charge": {
                "drops": [{ "location": "Solaris United (Rude Zuud), Old Mate", "chance": 1.0, "rarity": "Common", "type": "Pax Charge" }]
            },
            "Pax Soar": {
                "drops": [{ "location": "Solaris United (Rude Zuud), Old Mate", "chance": 1.0, "rarity": "Common", "type": "Pax Soar" }]
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
pub async fn js_log(message: String) {
    log::info!("[JS] {}", message);
}