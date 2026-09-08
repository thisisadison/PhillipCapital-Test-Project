import type { Digest, DigestRun, DigestSummary } from "@/server/domain/digest";

/**
 * Persistence boundary. The service layer and the UI both talk to this and
 * never to the filesystem, so swapping flat files for a database is a
 * single-implementation change.
 */
export interface DigestRepository {
  /** The most recent edition by date, or null if none has ever run. */
  findLatest(): Promise<Digest | null>;
  findByDate(date: string): Promise<Digest | null>;
  /** Newest first. */
  listSummaries(limit: number): Promise<DigestSummary[]>;
  save(digest: Digest): Promise<void>;
  /** Appends a run record. Every attempt is recorded, successful or not. */
  recordRun(run: DigestRun): Promise<void>;
  findLastRun(): Promise<DigestRun | null>;
  /** Most recent attempts, newest first. Used by the rate limiter. */
  listRuns(limit: number): Promise<DigestRun[]>;
}
