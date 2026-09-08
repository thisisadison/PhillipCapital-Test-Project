import { FileDigestRepository } from "./FileDigestRepository";
import type { DigestRepository } from "./DigestRepository";

export type { DigestRepository } from "./DigestRepository";
export { FileDigestRepository } from "./FileDigestRepository";

let cached: DigestRepository | undefined;

/**
 * The process-wide repository. Resolved lazily so importing this module stays
 * free of side effects and tests can construct their own instance.
 */
export function getDigestRepository(): DigestRepository {
  if (!cached) {
    cached = new FileDigestRepository(process.env.DIGEST_DATA_DIR?.trim() || "./data");
  }
  return cached;
}
