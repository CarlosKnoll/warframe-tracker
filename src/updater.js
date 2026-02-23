function log(msg) {
  window.__TAURI__.core.invoke('js_log', { message: msg }).catch(() => {});
}

log('1: script parsed');

const { listen } = window.__TAURI__.event;
log('2: tauri event available');

const { invoke } = window.__TAURI__.core;
const { getCurrentWindow } = window.__TAURI__.window;
const { WebviewWindow } = window.__TAURI__.webviewWindow;

log('3: all tauri apis destructured');

async function showMainAndClose() {
  log('showMainAndClose: start');
  const main = await WebviewWindow.getByLabel('main');
  log('showMainAndClose: got main = ' + !!main);
  if (main) {
    await main.show();
    log('showMainAndClose: main shown');
  }
  log('showMainAndClose: closing updater');
  await getCurrentWindow().close();
  log('showMainAndClose: done');
}

async function init() {
  log('4: init called');

  await listen('updater:checking', () => { log('event: checking'); status.textContent = 'Checking for updates...'; });
  log('5: checking listener registered');

  await listen('updater:found', (e) => { log('event: found ' + e.payload); });
  log('6: found listener registered');

  await listen('updater:progress', (e) => {});
  log('7: progress listener registered');

  await listen('updater:installing', () => { log('event: installing'); });
  log('8: installing listener registered');

  await listen('updater:done', () => { log('event: done'); });
  log('9: done listener registered');

  await listen('updater:uptodate', async () => {
    log('event: uptodate');
    await new Promise(r => setTimeout(r, 600));
    await showMainAndClose();
  });
  log('10: uptodate listener registered');

  await listen('updater:error', async (e) => {
    log('event: error ' + e.payload);
    await new Promise(r => setTimeout(r, 2000));
    await showMainAndClose();
  });
  log('11: all listeners registered');

  log('12: about to invoke check_for_updates');
  invoke('check_for_updates').catch(async (e) => {
    log('invoke failed: ' + e);
    await showMainAndClose();
  });
  log('13: invoke called (non-blocking)');
}

log('14: about to call init');
init().catch(async (e) => {
  log('init threw: ' + e);
  await showMainAndClose();
});
log('15: init called (non-blocking)');