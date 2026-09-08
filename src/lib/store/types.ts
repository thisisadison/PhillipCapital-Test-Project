import type { Digest, DigestRun, DigestSummary } from "@/lib/digest/schema";

/**
 * Persistence boundary for the digest. The UI and the pipeline both talk to
 * this interface and never to the filesystem directly, so swapping the flat
 * files for a database is a single-file change.
 */
export interface DigestStore {
  /** The most recent digest by edition date, or null if none has ever run. */
  getLatest(): Promise<Digest | null>;
  getByDate(date: string): Promise<Digest | null>;
  /** Newest first. */
  listSummaries(limit: number): Promise<DigestSummary[]>;
  save(digest: Digest): Promise<void>;
  /** Appends a run record. Every attempt is recorded, successful or not. */
  recordRun(run: DigestRun): Promise<void>;
  /** The most recent attempt of any kind, or null. */
  getLastRun(): Promise<DigestRun | null>;
  /** Most recent attempts, newest first. Used by the manual-trigger rate limiter. */
  listRuns(limit: number): Promise<DigestRun[]>;
}
