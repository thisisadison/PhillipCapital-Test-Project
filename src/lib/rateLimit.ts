import { MANUAL_COOLDOWN_MINUTES, MANUAL_RUNS_PER_DAY } from "@/lib/config";
import type { DigestRun } from "@/lib/digest/schema";

export interface RateLimitDecision {
  allowed: boolean;
  /** Seconds until the next attempt would be permitted. Zero when allowed. */
  retryAfterSeconds: number;
  /** Reader-facing explanation. Present only when blocked. */
  reason?: string;
}

/**
 * Decides whether a manual regeneration may proceed.
 *
 * Two independent limits, because they guard different things: a cooldown
 * against any recent run (a digest generated ten minutes ago will not change if
 * you ask again), and a daily ceiling on manual runs specifically (this is a
 * shared tool and each run costs real API spend).
 *
 * Derived from the persisted run log rather than in-memory counters, so it
 * survives a restart and holds across processes.
 */
export function evaluateManualTrigger(runs: DigestRun[], now: Date = new Date()): RateLimitDecision {
  const cooldownMs = MANUAL_COOLDOWN_MINUTES * 60_000;

  const mostRecent = runs.reduce<DigestRun | null>(
    (latest, run) => (!latest || run.finishedAt > latest.finishedAt ? run : latest),
    null,
  );

  if (mostRecent && cooldownMs > 0) {
    const elapsed = now.getTime() - new Date(mostRecent.finishedAt).getTime();
    if (elapsed >= 0 && elapsed < cooldownMs) {
      const retryAfterSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
      return {
        allowed: false,
        retryAfterSeconds,
        reason:
          // "A run finished", not "the digest was refreshed" — the most recent
          // run may have failed, in which case nothing was refreshed.
          `A digest run finished ${formatMinutes(elapsed)} ago. ` +
          `Runs are limited to one every ${MANUAL_COOLDOWN_MINUTES} minutes.`,
      };
    }
  }

  const dayAgo = now.getTime() - 86_400_000;
  const manualToday = runs.filter(
    (run) => run.trigger === "manual" && new Date(run.finishedAt).getTime() > dayAgo,
  );

  if (manualToday.length >= MANUAL_RUNS_PER_DAY) {
    const oldest = manualToday.reduce((earliest, run) =>
      run.finishedAt < earliest.finishedAt ? run : earliest,
    );
    const freesUpAt = new Date(oldest.finishedAt).getTime() + 86_400_000;

    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((freesUpAt - now.getTime()) / 1000)),
      reason:
        `The daily limit of ${MANUAL_RUNS_PER_DAY} manual refreshes has been reached. ` +
        `The scheduled run is unaffected and will still produce the next edition.`,
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

function formatMinutes(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
