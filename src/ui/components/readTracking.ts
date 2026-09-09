/**
 * Per-browser "already opened" tracking for digest entries.
 *
 * There are no user accounts in this tool — the whole team shares one access
 * code — so "who has read what" can only ever be a property of the browser,
 * not the person. It doesn't sync across devices or teammates and doesn't
 * survive clearing site data. That's an accepted limitation, not a bug: the
 * point of this tool is to stay light enough to need no accounts at all.
 *
 * Entry ids are a hash of the source URL (see `normaliseDraft`), so the same
 * article re-cited in a later edition is still recognised as already read.
 *
 * Exposes a tiny subscription so `useSyncExternalStore` can read this without
 * the effect-plus-setState pattern React's own lint rule warns against —
 * `markEntryRead` notifies every mounted card, each of which just re-checks
 * its own id, so this stays correct even if a source is ever rendered twice.
 */

const STORAGE_KEY = "digest-read-entries";

type Listener = () => void;
const listeners = new Set<Listener>();

function readStoredIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return new Set(
      Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [],
    );
  } catch {
    return new Set();
  }
}

export function isEntryRead(id: string): boolean {
  return readStoredIds().has(id);
}

export function markEntryRead(id: string): void {
  try {
    const ids = readStoredIds();
    if (ids.has(id)) return;
    ids.add(id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // A blocked or full store just means the mark won't persist — the entry
    // shows as unread again next visit, nothing worse. Still notify: the
    // in-memory read this session should still reflect the click.
  }
  for (const listener of listeners) listener();
}

export function subscribeToReadChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Always unread on the server — there is no browser to read from during SSR. */
export function getServerReadSnapshot(): boolean {
  return false;
}
