/**
 * 決定哪些快照該被 commit 回 repo。
 *
 * 依 docs/adr/0001 與 0004：抓取到的資料**不** commit 回 repo（避免每週
 * 一個機器人 commit），唯一例外是封存 —— 一季結束後把它的最終狀態凍結
 * 一次。判斷規則：
 *
 * 1. **該季已結束**（所有場次的結束時間都早於現在）且檔案有變動 → 封存。
 *    若不在結束時凍結，`/current/` 跨年後就不會再更新它，repo 裡會永遠
 *    停在賽季中的某一週。
 * 2. **新出現的球季檔案**（下一季賽程剛公布）→ 一併納入，讓本機開發的
 *    基準也能倒數到下一季。
 *
 * 只印出應納入的檔案路徑（一行一個），由呼叫端決定 commit；本腳本不碰 git 狀態。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SESSION_DURATION_MINUTES, type Snapshot } from '../src/domain/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_DIR = 'src/data/snapshots';

const seasonFinished = (snapshot: Snapshot, nowMs: number): boolean =>
  snapshot.weekends.every((w) =>
    w.sessions.every(
      (s) => Date.parse(s.startsAt) + SESSION_DURATION_MINUTES[s.kind] * 60_000 <= nowMs,
    ),
  );

const main = (): void => {
  // 以參數陣列呼叫、不經 shell —— 路徑不會被當成 shell 語法解讀。
  const status = execFileSync('git', ['status', '--porcelain', '--', SNAPSHOT_DIR], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const nowMs = Date.now();
  const toArchive: string[] = [];

  for (const line of status.split('\n').filter(Boolean)) {
    const code = line.slice(0, 2);
    const path = line.slice(3).trim();
    if (!path.endsWith('.json')) continue;

    const isNew = code.includes('?') || code.includes('A');
    if (isNew) {
      toArchive.push(path);
      continue;
    }

    const snapshot = JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as Snapshot;
    if (seasonFinished(snapshot, nowMs)) toArchive.push(path);
  }

  for (const path of toArchive) console.log(path);
};

main();
