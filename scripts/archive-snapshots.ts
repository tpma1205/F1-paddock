/**
 * 決定哪些快照該被 commit 回 repo。
 *
 * 依 docs/adr/0001 與 0004：抓取到的資料**不** commit 回 repo（避免每週
 * 一個機器人 commit），唯一例外是封存 —— 一季結束後把它的最終狀態凍結
 * 一次。判斷規則：
 *
 * 1. **該季已結束**（所有場次的結束時間都早於現在）且內容有實質變動 → 封存。
 *    若不在結束時凍結，`/current/` 跨年後就不會再更新它，repo 裡會永遠
 *    停在賽季中的某一週。「實質」是指 fetchedAt 以外的欄位：賽季結束後每週
 *    抓取仍會重寫 fetchedAt，若把那也當變動，會從賽末到跨年 commit 好幾次
 *    而非一次。
 * 2. **新出現的球季檔案**（下一季賽程剛公布）→ 一併納入，讓本機開發的
 *    基準也能倒數到下一季。
 *
 * 只印出應納入的檔案路徑（一行一個），由呼叫端決定 commit；本腳本不碰 git 狀態。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seasonFinished } from '../src/domain/season.ts';
import type { Snapshot } from '../src/domain/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_DIR = 'src/data/snapshots';

/** 兩份快照除了 fetchedAt 之外是否相同。 */
const materiallyEqual = (a: Snapshot, b: Snapshot): boolean =>
  JSON.stringify({ ...a, fetchedAt: null }) === JSON.stringify({ ...b, fetchedAt: null });

/** HEAD 上的版本；檔案在 HEAD 不存在時為 null。 */
const committedVersion = (path: string): Snapshot | null => {
  try {
    const text = execFileSync('git', ['show', `HEAD:${path}`], { cwd: ROOT, encoding: 'utf8' });
    return JSON.parse(text) as Snapshot;
  } catch {
    return null;
  }
};

const main = (): void => {
  // 以參數陣列呼叫、不經 shell —— 路徑不會被當成 shell 語法解讀。
  const status = execFileSync('git', ['status', '--porcelain', '-uall', '--', SNAPSHOT_DIR], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const nowMs = Date.now();
  const toArchive: string[] = [];

  const changed = status.split('\n').filter(Boolean).map((line) => ({ code: line.slice(0, 2), path: line.slice(3).trim() }));

  for (const { code, path } of changed) {
    // 只對核心快照做判斷；sidecar（timed/<season>.json）跟著同季的核心一起封存
    if (!/\/\d{4}\.json$/.test(path) || path.includes('/timed/')) continue;

    const isNew = code.includes('?') || code.includes('A');
    if (isNew) {
      toArchive.push(path);
      continue;
    }

    const snapshot = JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as Snapshot;
    if (!seasonFinished(snapshot, nowMs)) continue;

    const committed = committedVersion(path);
    if (committed && materiallyEqual(committed, snapshot)) continue; // 只有 fetchedAt 變了
    toArchive.push(path);
  }

  for (const path of [...toArchive]) {
    const sidecar = path.replace(/(\d{4})\.json$/, 'timed/$1.json');
    if (changed.some((c) => c.path === sidecar)) toArchive.push(sidecar);
  }

  for (const path of toArchive) console.log(path);
};

main();
