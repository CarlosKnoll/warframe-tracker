use tauri_plugin_log::Builder;
use tauri_plugin_log::Target;
use tauri_plugin_log::TargetKind;


mod commands;
mod utils;


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
                Builder::new()
                    .target(Target::new(TargetKind::LogDir { file_name: Some("updater".into()) }))
                    .build()
            )
        .invoke_handler(tauri::generate_handler![
            commands::data::load_owned,
            commands::data::save_owned,
            commands::data::load_custom_drops,
            commands::data::get_data_path,
            commands::updater::check_for_updates,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}