import { FileDigestStore } from "./fileStore";
import type { DigestStore } from "./types";

export type { DigestStore } from "./types";
export { FileDigestStore } from "./fileStore";

let cached: DigestStore | undefined;

/**
 * The process-wide store. Resolved lazily so importing this module stays free
 * of side effects and tests can construct their own `FileDigestStore`.
 */
export function getDigestStore(): DigestStore {
  if (!cached) {
    const root = process.env.DIGEST_DATA_DIR?.trim() || "./data";
    cached = new FileDigestStore(root);
  }
  return cached;
}
