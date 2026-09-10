import { z } from "zod";
import {
  auditDomainIdSchema,
  getAuditDomain,
  type AuditDomain,
  type AuditDomainId,
} from "./auditDomain";
import "./domains";

/**
 * The risk intake, as answered for whichever audit is being scoped.
 *
 * Selections are a map keyed by dimension id rather than fixed fields, because
 * the dimensions belong to the audit domain: an AML audit asks about customers,
 * products, channels and countries; a technology audit asks about the estate,
 * criticality, data, access and change. Hard-coding either set into this file
 * would make the tool an AML tool with a technology mode bolted on.
 *
 * Checkboxes, not a blank box. A blank box is the interface of a chat — it puts
 * the whole burden of knowing what matters on the auditor, and gives the
 * pipeline nothing it can trace a conclusion back to. A fixed vocabulary is
 * what lets every risk factor name the answer that produced it.
 */

export const riskIntakeSchema = z.object({
  domain: auditDomainIdSchema,
  /** Dimension id → selected option ids. Validated against the domain, not here. */
  selections: z.record(z.string(), z.array(z.string())),
  /** Optional. A programme can be produced from the selections alone. */
  note: z.string().max(1000).optional(),
});

export type RiskIntake = z.infer<typeof riskIntakeSchema>;

export interface IntakeProblem {
  dimensionId: string;
  message: string;
}

/**
 * Drops anything the domain does not define, and reports missing required
 * dimensions.
 *
 * Two jobs in one pass. The filtering is a security boundary: only ids from the
 * catalogue survive, so a crafted payload cannot smuggle text into a prompt.
 * The problems are a correctness one: an assessment missing a dimension its
 * framework mandates cannot be defended as that framework's assessment, so the
 * caller refuses rather than quietly scoping an audit on four fifths of a
 * profile.
 */
export function sanitiseIntake(intake: RiskIntake): {
  intake: RiskIntake;
  problems: IntakeProblem[];
} {
  const domain = getAuditDomain(intake.domain);
  const selections: Record<string, string[]> = {};
  const problems: IntakeProblem[] = [];

  for (const dimension of domain.dimensions) {
    const allowed = new Set(dimension.options.map((option) => option.id));
    const chosen = (intake.selections[dimension.id] ?? [])
      .filter((value) => allowed.has(value))
      .slice(0, 20);

    selections[dimension.id] = chosen;

    if (dimension.required && chosen.length === 0) {
      problems.push({
        dimensionId: dimension.id,
        message: `Select at least one option under ${dimension.label.toLowerCase()}`,
      });
    }
  }

  return {
    intake: {
      domain: intake.domain,
      selections,
      ...(intake.note?.trim() ? { note: intake.note.trim().slice(0, 1000) } : {}),
    },
    problems,
  };
}

/** Human-readable labels for a set of selected option ids. */
export function labelsFor(domain: AuditDomain, dimensionId: string, ids: string[]): string[] {
  const dimension = domain.dimensions.find((entry) => entry.id === dimensionId);
  if (!dimension) return [];

  return ids.flatMap((id) => {
    const option = dimension.options.find((entry) => entry.id === id);
    return option ? [option.label] : [];
  });
}

export function selectionsFor(intake: RiskIntake, dimensionId: string): string[] {
  return intake.selections[dimensionId] ?? [];
}

/** The intake rendered for a prompt — labels, not ids, so the model reads plain English. */
export function describeIntake(intake: RiskIntake): string {
  const domain = getAuditDomain(intake.domain);

  const lines = domain.dimensions.map((dimension) => {
    const labels = labelsFor(domain, dimension.id, selectionsFor(intake, dimension.id));
    return `- ${dimension.label} (\`${dimension.id}\`): ${
      labels.length > 0 ? labels.join(", ") : "none selected"
    }`;
  });

  if (intake.note) lines.push(`- Additional context from the auditor: ${intake.note}`);
  return lines.join("\n");
}

/** Total selections made, for the run record. */
export function countSelections(intake: RiskIntake): number {
  return Object.values(intake.selections).reduce((total, ids) => total + ids.length, 0);
}

/** An empty intake for a domain, ready for the form to fill in. */
export function emptyIntake(domainId: AuditDomainId): RiskIntake {
  const domain = getAuditDomain(domainId);
  return {
    domain: domainId,
    selections: Object.fromEntries(domain.dimensions.map((dimension) => [dimension.id, []])),
  };
}
