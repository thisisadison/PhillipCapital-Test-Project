import { mkdir, open, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";

/** A lock older than this is assumed to belong to a process that died. */
const STALE_LOCK_MS = 30_000;
const RETRY_DELAY_MS = 50;
const MAX_WAIT_MS = 5_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `fn` while holding an exclusive on-disk lock.
 *
 * The read-modify-write on the run log has to hold across processes, not just
 * across requests in one process: the scheduled job may run as a separate
 * `digest:generate` invocation while the web app is serving a manual trigger,
 * and the manual-trigger rate limit is only meaningful if it sees every run.
 */
export async function withFileLock<T>(lockPath: string, fn: () => Promise<T>): Promise<T> {
  await mkdir(dirname(lockPath), { recursive: true });
  const deadline = Date.now() + MAX_WAIT_MS;

  for (;;) {
    try {
      // 'wx' fails if the file exists, which makes acquisition atomic.
      const handle = await open(lockPath, "wx");
      await handle.close();
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;

      const age = await lockAgeMs(lockPath);
      if (age !== null && age > STALE_LOCK_MS) {
        await rm(lockPath, { force: true });
        continue;
      }
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for lock at ${lockPath}`);
      }
      await sleep(RETRY_DELAY_MS);
    }
  }

  try {
    return await fn();
  } finally {
    await rm(lockPath, { force: true });
  }
}

async function lockAgeMs(lockPath: string): Promise<number | null> {
  try {
    const stats = await stat(lockPath);
    return Date.now() - stats.mtimeMs;
  } catch {
    // The holder released it between our failed open and this stat.
    return null;
  }
}
