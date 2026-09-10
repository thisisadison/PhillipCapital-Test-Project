import { z } from "zod";
import { DIMENSION_IDS, riskIntakeSchema, type DimensionId } from "./riskIntake";
import { OBLIGATION_THEME_IDS } from "./masFramework";

/**
 * An audit programme, as a staged document rather than a single generated blob.
 *
 * The staging is the point. Each agent's output is persisted separately and
 * shown to the auditor — the risk factors, the obligations found, the proposed
 * scope — so the process between "here is my firm" and "here is the programme"
 * is inspectable and can be corrected. A programme that arrives complete in one
 * step is indistinguishable from a chat reply; one that arrives in reviewable
 * stages is a tool.
 */

export const RISK_RATINGS = ["high", "medium", "low"] as const;
export type RiskRating = (typeof RISK_RATINGS)[number];

export const RISK_LABELS: Record<RiskRating, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const RISK_ORDER: Record<RiskRating, number> = { high: 0, medium: 1, low: 2 };

/**
 * Where a programme is in its lifecycle. `planned` is the state that makes the
 * approval checkpoint real: the scope exists, the detailed steps do not, and
 * nothing further happens until the auditor says so.
 */
export const PROGRAMME_STATUSES = ["planned", "complete"] as const;
export type ProgrammeStatus = (typeof PROGRAMME_STATUSES)[number];

/** Risk Agent output. Traced back to the intake selections that produced it. */
export const riskFactorSchema = z.object({
  id: z.string().min(1),
  factor: z.string().min(1),
  severity: z.enum(RISK_RATINGS),
  /** Which of MAS's risk dimensions this sits under. Carries the card's colour. */
  dimension: z.enum(DIMENSION_IDS),
  /** Which intake answers drove this, in the auditor's own vocabulary. */
  drivenBy: z.array(z.string().min(1)).max(6),
  rationale: z.string().min(1),
});

export type RiskFactor = z.infer<typeof riskFactorSchema>;

/** MAS Agent output. Every obligation carries the source it was read from. */
export const obligationSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  requirement: z.string().min(1),
  /**
   * Which obligation theme this falls under. Null when it could not be
   * resolved — the obligation is still kept, because the citation is what
   * matters and the theme is navigation.
   */
  theme: z.enum(OBLIGATION_THEME_IDS).nullable(),
  sourceName: z.string().min(1),
  sourceUrl: z.url(),
});

export type Obligation = z.infer<typeof obligationSchema>;

export const auditStepSchema = z.object({
  id: z.string().min(1),
  procedure: z.string().min(1),
  evidenceRequired: z.string().min(1),
  sampling: z.string().optional(),
});

export type AuditStep = z.infer<typeof auditStepSchema>;

/**
 * Scope Agent output: a proposed control area, before any steps are written.
 *
 * This is what the auditor approves or drops. `approved` defaults to true so
 * the checkpoint is a review rather than a data-entry task, but nothing is
 * drafted for an area the auditor unticks.
 */
export const scopeAreaSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  riskRating: z.enum(RISK_RATINGS),
  /** Why this area is in scope for this firm, referencing the risk factors. */
  rationale: z.string().min(1),
  /** Ids of the risk factors this area answers. */
  addressesRiskFactors: z.array(z.string()).max(8),
  /** Ids of the obligations tested here. */
  testsObligations: z.array(z.string()).max(8),
  approved: z.boolean(),
  /** Populated by the Evidence Agent, and only for approved areas. */
  steps: z.array(auditStepSchema).default([]),
});

export type ScopeArea = z.infer<typeof scopeAreaSchema>;

/** One agent's execution, recorded so the pipeline can be read back afterwards. */
export const agentRunSchema = z.object({
  agent: z.enum(["risk", "mas", "scope", "evidence"]),
  startedAt: z.iso.datetime({ offset: true }),
  finishedAt: z.iso.datetime({ offset: true }),
  model: z.string(),
  /** What the agent produced, e.g. "6 risk factors". Shown in the timeline. */
  produced: z.string(),
  /** Estimated spend for this agent alone. */
  costUsd: z.number().nonnegative(),
  /** Anything dropped or degraded, surfaced rather than hidden. */
  notes: z.array(z.string()).default([]),
});

export type AgentRun = z.infer<typeof agentRunSchema>;

export const auditProgrammeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(PROGRAMME_STATUSES),
  createdAt: z.iso.datetime({ offset: true }),
  /** Set when the Evidence Agent has run. */
  completedAt: z.iso.datetime({ offset: true }).optional(),

  intake: riskIntakeSchema,
  scopeSummary: z.string().min(1),

  riskFactors: z.array(riskFactorSchema),
  obligations: z.array(obligationSchema),
  scopeAreas: z.array(scopeAreaSchema),

  /** The visible pipeline: one entry per agent that ran, in order. */
  runs: z.array(agentRunSchema),
});

export type AuditProgramme = z.infer<typeof auditProgrammeSchema>;

export interface ProgrammeSummary {
  id: string;
  title: string;
  status: ProgrammeStatus;
  createdAt: string;
  areaCount: number;
  stepCount: number;
}

export function totalSteps(programme: AuditProgramme): number {
  return programme.scopeAreas.reduce((total, area) => total + area.steps.length, 0);
}

/**
 * The risk dimension a scope area mostly answers, which is what gives its card
 * a colour.
 *
 * Derived rather than persisted: a scope area's dimension is entirely a
 * function of the risk factors it addresses, and storing a second copy of that
 * is how the two drift apart. Ties break towards the dimension declared first,
 * so the colour is stable across renders rather than dependent on map order.
 */
export function dominantDimension(
  area: ScopeArea,
  riskFactors: RiskFactor[],
): DimensionId | null {
  const byId = new Map(riskFactors.map((factor) => [factor.id, factor]));
  const counts = new Map<DimensionId, number>();

  for (const id of area.addressesRiskFactors) {
    const factor = byId.get(id);
    if (!factor) continue;
    counts.set(factor.dimension, (counts.get(factor.dimension) ?? 0) + 1);
  }

  let best: DimensionId | null = null;
  let bestCount = 0;
  for (const dimension of DIMENSION_IDS) {
    const count = counts.get(dimension) ?? 0;
    if (count > bestCount) {
      best = dimension;
      bestCount = count;
    }
  }
  return best;
}

/** Which obligation themes this programme actually reached. Drives the coverage strip. */
export function coveredThemes(programme: AuditProgramme): Set<string> {
  return new Set(
    programme.obligations.flatMap((obligation) => (obligation.theme ? [obligation.theme] : [])),
  );
}

export function totalCostUsd(programme: AuditProgramme): number {
  return programme.runs.reduce((total, run) => total + run.costUsd, 0);
}
