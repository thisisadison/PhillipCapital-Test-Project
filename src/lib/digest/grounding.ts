import { createHash } from "node:crypto";
import type { DigestEntry, DigestEntryDraft } from "./schema";
import type { RetrievedSource } from "./research";

export interface GroundingResult {
  entries: DigestEntry[];
  /** Entries dropped because their URL was never retrieved. Surfaced in the UI. */
  dropped: number;
  warnings: string[];
}

/**
 * Keeps only the entries whose source URL actually appeared in a search result.
 *
 * A digest is only as trustworthy as its links: an auditor who clicks through
 * to a 404 stops believing the rest of the page. The synthesis model is asked
 * to quote URLs verbatim from search results, and this enforces it rather than
 * relying on the instruction holding. Duplicates are collapsed at the same
 * time, since two categories can legitimately surface the same publication.
 */
export function groundEntries(
  drafts: DigestEntryDraft[],
  retrieved: RetrievedSource[],
): GroundingResult {
  const retrievedUrls = new Map<string, string>();
  for (const source of retrieved) {
    // Keep the canonical form the search tool gave us, keyed by its normalised
    // form, so published links are the ones the source actually serves.
    retrievedUrls.set(normalizeUrl(source.url), source.url);
  }

  const entries: DigestEntry[] = [];
  const seen = new Set<string>();
  const warnings: string[] = [];
  let dropped = 0;

  for (const draft of drafts) {
    const key = normalizeUrl(draft.sourceUrl);
    const canonicalUrl = retrievedUrls.get(key);

    if (!canonicalUrl) {
      dropped += 1;
      warnings.push(`Dropped "${truncate(draft.headline)}" — its URL was not in any search result.`);
      continue;
    }
    if (seen.has(key)) {
      warnings.push(`Dropped a duplicate entry for ${canonicalUrl}.`);
      continue;
    }

    seen.add(key);
    entries.push({ ...draft, sourceUrl: canonicalUrl, id: entryId(key) });
  }

  return { entries, dropped, warnings };
}

/**
 * Reduces a URL to a comparison key: scheme and host casing, `www.`, trailing
 * slashes, fragments and campaign parameters are all noise for identity.
 */
export function normalizeUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw.trim().toLowerCase();
  }

  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.protocol = url.protocol === "http:" ? "https:" : url.protocol;

  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$)/i.test(key)) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

/** Stable across regenerations of the same source, so React keys stay put. */
function entryId(normalizedUrl: string): string {
  return createHash("sha256").update(normalizedUrl).digest("hex").slice(0, 12);
}

function truncate(value: string, max = 60): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
