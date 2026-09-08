import { STALE_AFTER_DAYS, TIMEZONE } from "@/lib/config";
import { describeAge, formatEditionDate, formatTimestamp, toDateKey, daysBetween } from "./dates";
import type { Digest, DigestRun } from "./schema";

export type DigestHealth =
  /** A recent edition exists and the most recent run succeeded. */
  | "current"
  /** The newest edition is older than the cadence allows. */
  | "stale"
  /** An edition exists, but the most recent attempt to refresh it failed. */
  | "refresh-failed"
  /** Nothing has ever been published. */
  | "empty";

export interface StatusNotice {
  tone: "info" | "warning" | "error";
  title: string;
  detail: string;
}

export interface DigestStatus {
  health: DigestHealth;
  /** Age of the edition in whole days, or null when there is no edition. */
  ageDays: number | null;
  notice: StatusNotice | null;
}

/**
 * Decides how the current edition should be presented.
 *
 * The rule this encodes: an edition is only ever shown as current when the most
 * recent pipeline attempt actually succeeded and produced it. If a run failed
 * afterwards, or no run has happened in longer than the cadence allows, the
 * page says so above the content. Stale material is never dressed up as fresh —
 * the generation date is on the page unconditionally, and this adds the
 * interpretation of it.
 *
 * Pure, so the failure modes can be tested without a filesystem or an API key.
 */
export function deriveStatus(
  digest: Digest | null,
  lastRun: DigestRun | null,
  now: Date = new Date(),
): DigestStatus {
  if (!digest) {
    return { health: "empty", ageDays: null, notice: emptyNotice(lastRun) };
  }

  const ageDays = Math.max(0, daysBetween(digest.date, toDateKey(now, TIMEZONE)));

  // A failure after the edition was written is the case that matters most:
  // the content on screen is real, but it is not this week's.
  if (lastRun?.status === "failed" && lastRun.finishedAt > digest.generatedAt) {
    return {
      health: "refresh-failed",
      ageDays,
      notice: {
        tone: "error",
        title: "The latest refresh failed",
        detail:
          `An attempt to refresh the digest on ${formatTimestamp(lastRun.finishedAt, TIMEZONE)} did not ` +
          `complete. You are reading the edition of ${formatEditionDate(digest.date)}, generated ` +
          `${describeAge(digest.generatedAt, now)}. It has not been updated since.`,
      },
    };
  }

  if (ageDays > STALE_AFTER_DAYS) {
    return {
      health: "stale",
      ageDays,
      notice: {
        tone: "warning",
        title: "This edition is out of date",
        detail:
          `The most recent edition is from ${formatEditionDate(digest.date)}, ${ageDays} days ago. ` +
          `A new one was expected before now, so the scheduled job may not be running.`,
      },
    };
  }

  return { health: "current", ageDays, notice: null };
}

function emptyNotice(lastRun: DigestRun | null): StatusNotice {
  if (lastRun?.status === "failed") {
    return {
      tone: "error",
      title: "No digest has been published yet",
      detail:
        `The most recent attempt, on ${formatTimestamp(lastRun.finishedAt, TIMEZONE)}, failed before it ` +
        `produced an edition. Nothing is being hidden from you — there is genuinely nothing to show yet.`,
    };
  }

  return {
    tone: "info",
    title: "No digest has been published yet",
    detail:
      "The first edition will appear here once the scheduled research run has completed. " +
      "Nothing has been generated so far.",
  };
}
