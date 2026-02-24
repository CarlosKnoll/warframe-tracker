use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;
use log::error;

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<bool, String> {
    let updater = app.updater().map_err(|e| {
        error!("[Updater] Failed to initialize updater: {}", e);
        e.to_string()
    })?;

    app.emit("updater:checking", ()).ok();

    match updater.check().await {
        Ok(Some(update)) => {
            app.emit("updater:found", &update.version).ok();

            update
                .download_and_install(
                    |chunk, total| {
                        let _ = app.emit("updater:progress", (chunk, total));
                    },
                    || {
                        let _ = app.emit("updater:installing", ());
                    },
                )
                .await
                .map_err(|e| {
                    error!("[Updater] Download/install failed: {}", e);
                    e.to_string()
                })?;

            app.emit("updater:done", ()).ok();
            Ok(true)
        }
        Ok(None) => {
            app.emit("updater:uptodate", ()).ok();
            Ok(false)
        }
        Err(e) => {
            error!("[Updater] Check failed: {}", e);
            app.emit("updater:error", e.to_string()).ok();
            Err(e.to_string())
        }
    }
}