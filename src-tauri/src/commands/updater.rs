use log::error;
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<bool, String> {
    let updater = app.updater().map_err(|e| {
        error!("[Updater] Failed to initialize updater: {}", e);
        e.to_string()
    })?;

    match updater.check().await {
        Ok(Some(update)) => {
            update
                .download_and_install(|_chunk, _total| {}, || {})
                .await
                .map_err(|e| {
                    error!("[Updater] Download/install failed: {}", e);
                    e.to_string()
                })?;

            Ok(true)
        }
        Ok(None) => Ok(false),
        Err(e) => {
            error!("[Updater] Check failed: {}", e);
            Err(e.to_string())
        }
    }
}