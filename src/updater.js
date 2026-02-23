const { listen } = window.__TAURI__.event;
const { invoke } = window.__TAURI__.core;
const { getCurrentWindow } = window.__TAURI__.window;
const { WebviewWindow } = window.__TAURI__.webviewWindow;

const status = document.getElementById('status');
const progressTrack = document.getElementById('progressTrack');
const progressBar = document.getElementById('progressBar');
const versionEl = document.getElementById('version');
const spinner = document.getElementById('spinner');

async function showMainAndClose() {
  const main = await WebviewWindow.getByLabel('main');
  if (main) await main.show();
  await getCurrentWindow().close();
}

await listen('updater:checking', () => {
  status.textContent = 'Checking for updates...';
});

await listen('updater:found', (e) => {
  status.textContent = `Downloading update ${e.payload}...`;
  versionEl.textContent = `v${e.payload}`;
  progressTrack.classList.remove('hidden');
});

await listen('updater:progress', (e) => {
  const [chunk, total] = e.payload;
  if (total) {
    const pct = Math.round((chunk / total) * 100);
    progressBar.style.width = `${pct}%`;
  }
});

await listen('updater:installing', () => {
  status.textContent = 'Installing update...';
  progressBar.style.width = '100%';
});

await listen('updater:done', () => {
  status.textContent = 'Update installed. Restarting...';
  spinner.classList.add('hidden');
});

await listen('updater:uptodate', async () => {
  status.textContent = 'Up to date!';
  spinner.classList.add('hidden');
  await new Promise(r => setTimeout(r, 600));
  await showMainAndClose();
});

await listen('updater:error', async (e) => {
  status.textContent = `Update check failed.`;
  versionEl.textContent = e.payload;
  spinner.classList.add('hidden');
  await new Promise(r => setTimeout(r, 2000));
  await showMainAndClose();
});

// Kick off the update check
invoke('check_for_updates').catch(async () => {
  await showMainAndClose();
});