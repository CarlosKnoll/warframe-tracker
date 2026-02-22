use log::{error, info};
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;
use tauri_plugin_log::TargetKind;

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<bool, String> {
    let updater = app.updater().map_err(|e| {
        error!("[Updater] Failed to initialize updater: {}", e);
        e.to_string()
    })?;

    info!("[Updater] Checking for updates...");

    match updater.check().await {
        Ok(Some(update)) => {
            info!(
                "[Updater] Update found: {} -> {}",
                update.current_version, update.version
            );

            update
                .download_and_install(
                    |chunk_length, content_length| {
                        info!(
                            "[Updater] Downloading... {} / {:?} bytes",
                            chunk_length, content_length
                        );
                    },
                    || {
                        info!("[Updater] Download complete, installing...");
                    },
                )
                .await
                .map_err(|e| {
                    error!("[Updater] Download/install failed: {}", e);
                    e.to_string()
                })?;

            info!("[Updater] Install complete.");
            Ok(true)
        }
        Ok(None) => {
            info!("[Updater] App is up to date.");
            Ok(false)
        }
        Err(e) => {
            error!("[Updater] Check failed: {}", e);
            Err(e.to_string())
        }
    }
}