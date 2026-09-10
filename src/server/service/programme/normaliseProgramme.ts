import { createHash } from "node:crypto";
import {
  RISK_ORDER,
  RISK_RATINGS,
  type ProgrammeSection,
  type RiskRating,
} from "@/server/domain/programme";
import type { SourceIndex } from "../synthesis/sourceIndex";
import type { DraftSection, ProgrammeDraft } from "./programmeDraftSchema";

const MIN_RATIONALE_CHARS = 40;
const MIN_PROCEDURE_CHARS = 25;
const MAX_TEXT = 600;
const MAX_SECTIONS = 12;
const MAX_STEPS_PER_SECTION = 10;

export interface NormalisedProgramme {
  title: string;
  scopeSummary: string;
  sections: ProgrammeSection[];
  rejections: string[];
}

/**
 * Turns a generated draft into a publishable programme.
 *
 * Same governing rule as the digest: a problem with one section costs that
 * section, never the whole programme. A section survives only if it cites a
 * source that was actually retrieved and carries at least one usable step —
 * an audit step with no evidence to collect is not a step, it is a sentence.
 */
export function normaliseProgramme(
  draft: ProgrammeDraft,
  sources: SourceIndex,
): NormalisedProgramme {
  const sections: ProgrammeSection[] = [];
  const rejections: string[] = [];
  const seenTitles = new Set<string>();

  for (const raw of draft.sections.slice(0, MAX_SECTIONS)) {
    const outcome = normaliseSection(raw, sources, seenTitles);

    if ("reason" in outcome) {
      rejections.push(`Dropped "${label(raw.title)}" — ${outcome.reason}.`);
      continue;
    }

    seenTitles.add(outcome.section.title.toLowerCase());
    sections.push(outcome.section);
  }

  // The riskiest areas lead: an auditor working top-down should hit the
  // material coverage first if they run out of time.
  sections.sort((a, b) => RISK_ORDER[a.riskRating] - RISK_ORDER[b.riskRating]);

  return {
    title: collapse(draft.title) || "AML Internal Audit Programme",
    scopeSummary: clamp(collapse(draft.scopeSummary), MAX_TEXT),
    sections,
    rejections,
  };
}

type SectionOutcome = { section: ProgrammeSection } | { reason: string };

function normaliseSection(
  raw: DraftSection,
  sources: SourceIndex,
  seenTitles: Set<string>,
): SectionOutcome {
  const source = sources.resolve(raw.sourceId);
  if (!source) return { reason: `it cited an unknown source (${label(raw.sourceId, 12)})` };

  const title = collapse(raw.title);
  if (!title) return { reason: "it has no title" };
  if (seenTitles.has(title.toLowerCase())) return { reason: "it duplicates an earlier section" };

  const rationale = collapse(raw.rationale);
  if (rationale.length < MIN_RATIONALE_CHARS) {
    return { reason: "it does not explain why the area is in scope" };
  }

  const requirementReference = collapse(raw.requirementReference);
  if (!requirementReference) return { reason: "it names no requirement to test against" };

  const steps = normaliseSteps(raw.steps);
  if (steps.length === 0) return { reason: "it contains no usable audit steps" };

  return {
    section: {
      id: hashId(`${title}|${source.url}`),
      title: clamp(title, 120),
      riskRating: normaliseRisk(raw.riskRating),
      rationale: clamp(rationale, MAX_TEXT),
      requirementReference: clamp(requirementReference, 160),
      sourceName: source.title.split(/\s[|–—-]\s/).pop()?.trim() || source.url,
      sourceUrl: source.url,
      steps,
    },
  };
}

function normaliseSteps(raw: DraftSection["steps"]): ProgrammeSection["steps"] {
  const steps: ProgrammeSection["steps"] = [];

  for (const step of raw.slice(0, MAX_STEPS_PER_SECTION)) {
    const procedure = collapse(step.procedure);
    const evidenceRequired = collapse(step.evidenceRequired);

    // A step the auditor cannot act on, or that asks for nothing back, is not
    // a step. Dropping it is better than padding the programme with prose.
    if (procedure.length < MIN_PROCEDURE_CHARS || !evidenceRequired) continue;

    const sampling = collapse(step.sampling ?? "");
    steps.push({
      id: hashId(procedure),
      procedure: clamp(procedure, MAX_TEXT),
      evidenceRequired: clamp(evidenceRequired, MAX_TEXT),
      ...(sampling ? { sampling: clamp(sampling, 240) } : {}),
    });
  }
  return steps;
}

/** Unknown wording is treated as medium — never inflated to high, never dismissed as low. */
function normaliseRisk(raw: string): RiskRating {
  const key = raw.trim().toLowerCase().replace(/[^a-z]/g, "");

  for (const rating of RISK_RATINGS) {
    if (rating === key) return rating;
  }
  if (key.startsWith("high") || key === "critical" || key === "severe") return "high";
  if (key.startsWith("low") || key === "minor") return "low";
  return "medium";
}

function hashId(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clamp(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

function label(value: string, max = 60): string {
  const collapsed = collapse(value);
  if (!collapsed) return "untitled";
  return collapsed.length <= max ? collapsed : `${collapsed.slice(0, max - 1)}…`;
}
