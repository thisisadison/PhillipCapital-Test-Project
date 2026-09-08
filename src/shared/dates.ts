/**
 * Date helpers. Everything the reader sees is expressed in the team's own
 * timezone, so an edition dated "8 September" is the 8th in Singapore
 * regardless of where the job ran.
 *
 * Safe to import from client components: no Node built-ins.
 */

export const DEFAULT_TIMEZONE = "Asia/Singapore";

/** `YYYY-MM-DD` in the given timezone. `en-CA` formats exactly that way. */
export function toDateKey(date: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Shifts a `YYYY-MM-DD` key by whole days without touching timezones. */
export function addDays(dateKey: string, days: number): string {
  const parsed = parseDateKey(dateKey);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`. Negative when `to` precedes `from`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000);
}

/** "8 September 2026" — the edition date as it reads in the masthead. */
export function formatEditionDate(dateKey: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDateKey(dateKey));
}

/** "8 Sept" — for the archive list and the coverage range. */
export function formatShortDate(dateKey: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(parseDateKey(dateKey));
}

/**
 * "8 Sept 2026 06:14 GMT+8" — the generation timestamp. Always rendered in full
 * rather than as "2 days ago": the reader needs to be able to judge freshness
 * for themselves, not take our word for it.
 */
export function formatTimestamp(iso: string, timeZone: string = DEFAULT_TIMEZONE): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";

  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${formatted.replace(",", "")} ${timeZoneAbbreviation(date, timeZone)}`;
}

/** Coarse phrasing for how old something is. Shown alongside, never instead of, the timestamp. */
export function describeAge(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "at an unknown time";

  const minutes = Math.round((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} ago`;

  return `${Math.round(days / 7)} weeks ago`;
}

function parseDateKey(dateKey: string): Date {
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  return date;
}

function timeZoneAbbreviation(date: Date, timeZone: string): string {
  const part = new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "short" })
    .formatToParts(date)
    .find((candidate) => candidate.type === "timeZoneName");
  return part?.value ?? "";
}
