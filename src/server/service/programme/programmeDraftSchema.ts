import { z } from "zod";

/**
 * The wire schema for a generated programme.
 *
 * Permissive by design, for the same reason as the digest's draft schema: the
 * API does not enforce enums or length bounds, so encoding editorial rules here
 * would mean one stray value destroys the whole programme. Every rule lives in
 * `normaliseProgramme` instead, which repairs what it can and drops one section
 * at a time.
 */
export const draftStepSchema = z.object({
  procedure: z.string(),
  evidenceRequired: z.string(),
  sampling: z.string().optional(),
});

export const draftSectionSchema = z.object({
  title: z.string(),
  riskRating: z.string(),
  rationale: z.string(),
  requirementReference: z.string(),
  /** Catalogue handle, e.g. `S03`. The model never writes a URL. */
  sourceId: z.string(),
  steps: z.array(draftStepSchema),
});

export const programmeDraftSchema = z.object({
  title: z.string(),
  scopeSummary: z.string(),
  sections: z.array(draftSectionSchema),
});

export type ProgrammeDraft = z.infer<typeof programmeDraftSchema>;
export type DraftSection = z.infer<typeof draftSectionSchema>;
