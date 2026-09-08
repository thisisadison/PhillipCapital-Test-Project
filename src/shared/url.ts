/**
 * URL helpers. Pure, and safe to import from either side — the publisher mark
 * needs a hostname in the browser, and the pipeline needs one on the server.
 */

/** The registrable host, lowercased and without `www.`. Null if unparseable. */
export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
