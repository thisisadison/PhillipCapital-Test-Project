import { z } from "zod";

/**
 * An internal audit programme: the actual steps an auditor works through.
 *
 * Deliberately a different shape from a digest entry. A digest tells you what
 * changed; a programme tells you what to go and test, and what to ask for as
 * evidence. The two share the grounding rule — every requirement cites a source
 * that was actually retrieved — and nothing else.
 */

export const RISK_RATINGS = ["high", "medium", "low"] as const;
export type RiskRating = (typeof RISK_RATINGS)[number];

export const RISK_LABELS: Record<RiskRating, string> = {
  high: "High risk",
  medium: "Medium risk",
  low: "Low risk",
};

export const auditStepSchema = z.object({
  id: z.string().min(1),
  /** What the auditor actually does. Imperative: "Obtain…", "Reperform…". */
  procedure: z.string().min(1),
  /** What the auditor should ask the business to produce. */
  evidenceRequired: z.string().min(1),
  /** Population and sample guidance, when the step is a testing step. */
  sampling: z.string().optional(),
});

export type AuditStep = z.infer<typeof auditStepSchema>;

export const programmeSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** Drives ordering and the amount of coverage the section gets. */
  riskRating: z.enum(RISK_RATINGS),
  /** Why this area is in scope, tied back to the risk context supplied. */
  rationale: z.string().min(1),
  /** The obligation being tested, e.g. "MAS Notice 626, para 6". */
  requirementReference: z.string().min(1),
  sourceName: z.string().min(1),
  sourceUrl: z.url(),
  steps: z.array(auditStepSchema).min(1),
});

export type ProgrammeSection = z.infer<typeof programmeSectionSchema>;

export const auditProgrammeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  generatedAt: z.iso.datetime({ offset: true }),
  /** The risk context the auditor supplied, kept verbatim for traceability. */
  riskContext: z.string().min(1),
  /** One paragraph naming what this programme covers and what it deliberately does not. */
  scopeSummary: z.string().min(1),
  sections: z.array(programmeSectionSchema),
  meta: z.object({
    model: z.string(),
    sourcesConsulted: z.number().int().nonnegative(),
    /** Sections dropped in normalisation — an ungrounded citation, or no steps. */
    sectionsRejected: z.number().int().nonnegative(),
  }),
});

export type AuditProgramme = z.infer<typeof auditProgrammeSchema>;

export interface ProgrammeSummary {
  id: string;
  title: string;
  generatedAt: string;
  sectionCount: number;
  stepCount: number;
}

/** Ordering for display: the riskiest areas lead the programme. */
export const RISK_ORDER: Record<RiskRating, number> = { high: 0, medium: 1, low: 2 };
