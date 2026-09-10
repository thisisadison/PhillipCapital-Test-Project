import type { AuditProgramme, ProgrammeSummary } from "@/server/domain/programme";

/**
 * Persistence boundary for audit programmes. Separate from `DigestRepository`
 * because the two store unrelated things — a weekly edition and a work
 * programme have no lifecycle in common.
 */
export interface ProgrammeRepository {
  findById(id: string): Promise<AuditProgramme | null>;
  /** Newest first. */
  listSummaries(limit: number): Promise<ProgrammeSummary[]>;
  findLatest(): Promise<AuditProgramme | null>;
  save(programme: AuditProgramme): Promise<void>;
}
