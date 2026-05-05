use std::fs;
use serde_json::Value;
use crate::utils::get_data_dir;

#[tauri::command]
pub fn load_tasks_cache() -> Result<Value, String> {
    let path = get_data_dir().join("tasks_cache.json");
    if !path.exists() {
        return Ok(Value::Null);
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_tasks_cache(data: Value) -> Result<(), String> {
    let path = get_data_dir().join("tasks_cache.json");
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}