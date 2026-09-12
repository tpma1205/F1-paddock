/**
 * 建置後：為每個已知路由產生實體 index.html，並放置 404.html 安全網。
 *
 * GitHub Pages 是純靜態伺服器，不認得前端路由。直接開 /f1-paddock/drivers
 * 它會去找一個叫 drivers 的檔案。解法（docs/adr/0002）：把 dist/index.html
 * 複製到 dist/<route>/index.html —— 因為資料由前端載入，每個 HTML 外殼內容
 * 完全相同，複製就夠了，不需要 SSR。
 *
 * **路由清單來自 View Model（routesFor），本腳本不自己硬編。**
 *
 * 404.html 是安全網：打錯網址時 GitHub Pages 會送出它，SPA 照樣啟動並由
 * React Router 呈現對應頁面 —— 所以就算某個路由沒被預先產生也不會壞，
 * 只是回 404 狀態碼而非 200。
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildViewModel } from '../src/domain/viewModel.ts';
import { routesFor } from '../src/domain/routes.ts';
import type { Snapshot } from '../src/domain/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SNAPSHOTS = join(ROOT, 'src', 'data', 'snapshots');

/** 讀入所有球季的快照 —— 賽程季與積分季由 buildViewModel 決定。 */
const loadSnapshots = (): Snapshot[] =>
  readdirSync(SNAPSHOTS)
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(join(SNAPSHOTS, name), 'utf8')) as Snapshot);

const main = (): void => {
  const indexHtml = join(DIST, 'index.html');
  if (!existsSync(indexHtml)) {
    throw new Error('dist/index.html 不存在 —— 請先執行 `vite build`。');
  }

  const viewModel = buildViewModel(loadSnapshots(), new Date());
  const routes = routesFor(viewModel).filter((route) => route !== '/');

  for (const route of routes) {
    const dir = join(DIST, ...route.split('/').filter(Boolean));
    mkdirSync(dir, { recursive: true });
    copyFileSync(indexHtml, join(dir, 'index.html'));
  }

  copyFileSync(indexHtml, join(DIST, '404.html'));

  console.log(`✓ 產生 ${routes.length} 個路由的實體 HTML，並放置 404.html 安全網`);
};

main();
