function log(msg) {
  window.__TAURI__.core.invoke('js_log', { message: msg }).catch(() => {});
}

const { listen } = window.__TAURI__.event;
const { invoke } = window.__TAURI__.core;
const { getCurrentWindow } = window.__TAURI__.window;
const { WebviewWindow } = window.__TAURI__.webviewWindow;

async function showMainAndClose() {
  const main = await WebviewWindow.getByLabel('main');
  if (main) {
    await main.show();
  }
  await getCurrentWindow().close();
}

async function init() {
  await listen('updater:checking', () => {});
  await listen('updater:found', (e) => {});
  await listen('updater:progress', (e) => {});
  await listen('updater:installing', () => {});
  await listen('updater:done', () => {});

  await listen('updater:uptodate', async () => {
    await new Promise(r => setTimeout(r, 600));
    await showMainAndClose();
  });

  await listen('updater:error', async (e) => {
    log('updater error: ' + e.payload);
    await new Promise(r => setTimeout(r, 2000));
    await showMainAndClose();
  });

  invoke('check_for_updates').catch(async (e) => {
    log('invoke failed: ' + e);
    await showMainAndClose();
  });
}

init().catch(async (e) => {
  log('init threw: ' + e);
  await showMainAndClose();
});