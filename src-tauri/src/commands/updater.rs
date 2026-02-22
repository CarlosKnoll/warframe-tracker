use tauri::AppHandle;
use tauri::Manager;
use tauri::process::restart;
use tauri_plugin_updater::UpdaterExt;

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<bool, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;

    match updater.check().await {
        Ok(Some(update)) => {
            println!("Update available: {}", update.version);

            update
                .download_and_install(|_, _| {}, || {})
                .await
                .map_err(|e| e.to_string())?;

            // Restart the app to apply the update
            restart(&app.env());

            Ok(true)
        }
        Ok(None) => {
            println!("App is up to date");
            Ok(false)
        }
        Err(e) => {
            eprintln!("Failed to check for updates: {}", e);
            Err(e.to_string())
        }
    }
}