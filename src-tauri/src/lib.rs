use tauri::Manager;
use tauri_plugin_log::Builder;
use tauri_plugin_log::Target;
use tauri_plugin_log::TargetKind;


mod commands;
mod utils;


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    tauri::Builder::default()

        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                // In dev, skip updater and show main window directly
                if let Some(main) = app.get_webview_window("main") {
                    main.show().ok();
                }
                if let Some(updater_win) = app.get_webview_window("updater") {
                    updater_win.close().ok();
                }
            }
            Ok(())
        })

        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
                Builder::new()
                    .level(log::LevelFilter::Info)
                    .target(Target::new(TargetKind::Folder {
                        path: utils::get_install_dir().join("logs"),
                        file_name: Some("updater".into()),
                    }))
                    .build()
                )
        .invoke_handler(tauri::generate_handler![
            commands::data::load_owned,
            commands::data::save_owned,
            commands::data::load_custom_drops,
            commands::data::fetch_image_base64,
            commands::data::get_data_path,
            commands::data::load_image_cache,
            commands::data::save_image_cache,
            commands::data::load_prime_image_cache,
            commands::data::save_prime_image_cache,
            commands::updater::check_for_updates,
            commands::updater::js_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}