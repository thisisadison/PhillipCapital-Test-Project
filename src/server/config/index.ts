import { DEFAULT_TIMEZONE } from "@/shared/dates";

/**
 * Runtime configuration, read from the environment.
 *
 * Anything here a reader could be misled by — the cadence, the staleness
 * threshold — is also stated in the UI, so the page never claims to be current
 * on a promise the configuration does not keep.
 */

/** The team's timezone. Edition dates and timestamps are rendered in it. */
export const TIMEZONE = process.env.DIGEST_TIMEZONE?.trim() || DEFAULT_TIMEZONE;

/** How many days of developments one edition covers. */
export const COVERAGE_DAYS = 7;

/**
 * After this many days without a successful run, the edition on screen is
 * labelled out of date. Cadence plus a couple of days of grace, so a single
 * missed Monday shows up rather than passing unnoticed.
 */
export const STALE_AFTER_DAYS = 10;

/** Minimum gap between runs before a manual regeneration is allowed. */
export const MANUAL_COOLDOWN_MINUTES = numberFromEnv("DIGEST_MANUAL_COOLDOWN_MINUTES", 30);

/** Ceiling on manual runs per rolling day, independent of the cooldown. */
export const MANUAL_RUNS_PER_DAY = numberFromEnv("DIGEST_MANUAL_RUNS_PER_DAY", 6);

/** How many past editions the archive lists. */
export const ARCHIVE_LIMIT = 24;

/** Human-readable cadence, shown in the UI and the empty state. */
export const CADENCE_LABEL = "every Monday, 06:00";

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
