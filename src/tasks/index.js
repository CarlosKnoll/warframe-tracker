import { loadTasksCache, saveTasksCache, fetchWorldstate } from './loader.js';
import { renderTasks } from './renderer.js';

export async function initTasks() {
  // 1. Load + validate cache from disk (resets stale tiers)
  await loadTasksCache();

  // 2. Fetch live worldstate in background — render immediately with static data,
  //    then re-render once fetch settles (non-blocking)
  fetchWorldstate().then(() => renderTasks());

  // 3. Initial render (may be missing live data — that's fine)
  renderTasks();
}

window.addEventListener('langchange', () => {
  fetchWorldstate().then(() => renderTasks());
});

export { renderTasks };
export { addCustomTask, removeCustomTask } from './loader.js';