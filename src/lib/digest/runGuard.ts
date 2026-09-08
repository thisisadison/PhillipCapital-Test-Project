/**
 * Serialises pipeline runs within this process.
 *
 * A run takes minutes and costs real API spend, so two overlapping runs are
 * always a mistake — the second would race the first to write the same edition
 * file. Callers are told the pipeline is busy rather than being queued behind
 * it, because the honest answer to "regenerate now" while a run is in flight is
 * "one is already running".
 */

let inFlight: Promise<unknown> | null = null;

export type ExclusiveOutcome<T> = { status: "ran"; result: T } | { status: "busy" };

export async function runExclusive<T>(fn: () => Promise<T>): Promise<ExclusiveOutcome<T>> {
  if (inFlight) return { status: "busy" };

  const promise = fn();
  inFlight = promise;
  try {
    return { status: "ran", result: await promise };
  } finally {
    inFlight = null;
  }
}
