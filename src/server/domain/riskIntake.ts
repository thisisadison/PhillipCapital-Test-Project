import { z } from "zod";

/**
 * The structured risk intake.
 *
 * Fixed options rather than a free-text box, for two reasons. A blank box is
 * the interface of a chat, not of a process: it puts the whole burden of
 * knowing what matters on the auditor. And a fixed vocabulary is what lets the
 * Risk Agent's output be traced back to specific answers — "this factor exists
 * because you selected third-party introducers" — which a paragraph of prose
 * cannot support.
 *
 * The optional note at the end exists for the thing no option list anticipated.
 * It is genuinely optional; a programme can be produced from checkboxes alone.
 */

export interface IntakeOption {
  id: string;
  label: string;
  /** Shown under the label where the option's audit relevance is not obvious. */
  hint?: string;
}

export interface IntakeQuestion {
  id: "businessLines" | "clientBase" | "channels" | "riskFlags";
  label: string;
  help: string;
  options: readonly IntakeOption[];
}

export const INTAKE_QUESTIONS: readonly IntakeQuestion[] = [
  {
    id: "businessLines",
    label: "Business lines in scope",
    help: "What the firm actually does. Drives which obligations apply at all.",
    options: [
      { id: "retail-brokerage", label: "Retail brokerage" },
      { id: "institutional-brokerage", label: "Institutional brokerage" },
      { id: "wealth-advisory", label: "Wealth management / advisory" },
      { id: "custody", label: "Custody and safekeeping" },
      { id: "prop-trading", label: "Proprietary trading" },
      { id: "digital-assets", label: "Digital asset services" },
    ],
  },
  {
    id: "clientBase",
    label: "Client base",
    help: "Who the firm onboards. The single biggest driver of due-diligence risk.",
    options: [
      { id: "sg-resident", label: "Singapore residents" },
      { id: "non-resident", label: "Non-resident individuals", hint: "Raises jurisdiction risk" },
      { id: "corporate", label: "Corporate and institutional" },
      { id: "complex-structures", label: "Trusts and complex structures", hint: "Beneficial ownership" },
      { id: "peps", label: "Politically exposed persons", hint: "Mandatory enhanced due diligence" },
      { id: "high-risk-jurisdictions", label: "Clients in higher-risk jurisdictions" },
    ],
  },
  {
    id: "channels",
    label: "Onboarding channels",
    help: "How clients arrive. Determines who performs the due diligence and who holds the evidence.",
    options: [
      { id: "digital", label: "Digital / non-face-to-face" },
      { id: "branch", label: "In-person" },
      { id: "introducers", label: "Third-party introducers", hint: "Reliance on another party's CDD" },
      { id: "rm-led", label: "Relationship-manager led" },
    ],
  },
  {
    id: "riskFlags",
    label: "Known concerns",
    help: "Anything already on your radar. Each one pulls a control area into scope.",
    options: [
      { id: "monitoring-stale", label: "Transaction monitoring not retuned recently" },
      { id: "manual-screening", label: "Screening is manual or spreadsheet-based" },
      { id: "rapid-growth", label: "Rapid growth in new accounts" },
      { id: "prior-findings", label: "Prior AML findings still open" },
      { id: "third-party-funding", label: "Third-party or cash funding of accounts" },
      { id: "high-turnover", label: "High staff turnover in compliance" },
      { id: "outsourced-compliance", label: "Compliance functions outsourced" },
    ],
  },
] as const;

const OPTION_IDS = new Map<string, Set<string>>(
  INTAKE_QUESTIONS.map((question) => [
    question.id,
    new Set(question.options.map((option) => option.id)),
  ]),
);

export const riskIntakeSchema = z.object({
  businessLines: z.array(z.string()).min(1, "Select at least one business line"),
  clientBase: z.array(z.string()).min(1, "Select at least one client type"),
  channels: z.array(z.string()).min(1, "Select at least one onboarding channel"),
  riskFlags: z.array(z.string()),
  /** Optional. A programme can be produced from the selections alone. */
  note: z.string().max(1000).optional(),
});

export type RiskIntake = z.infer<typeof riskIntakeSchema>;

/** Drops anything not in the option catalogue, so a crafted payload cannot inject prompt text. */
export function sanitiseIntake(intake: RiskIntake): RiskIntake {
  const keep = (questionId: string, values: string[]) =>
    values.filter((value) => OPTION_IDS.get(questionId)?.has(value)).slice(0, 20);

  return {
    businessLines: keep("businessLines", intake.businessLines),
    clientBase: keep("clientBase", intake.clientBase),
    channels: keep("channels", intake.channels),
    riskFlags: keep("riskFlags", intake.riskFlags),
    ...(intake.note?.trim() ? { note: intake.note.trim().slice(0, 1000) } : {}),
  };
}

/** Human-readable labels for a set of selected option ids. */
export function labelsFor(questionId: IntakeQuestion["id"], ids: string[]): string[] {
  const question = INTAKE_QUESTIONS.find((entry) => entry.id === questionId);
  if (!question) return [];

  return ids.flatMap((id) => {
    const option = question.options.find((entry) => entry.id === id);
    return option ? [option.label] : [];
  });
}

/** The intake rendered for a prompt — labels, not ids, so the model reads plain English. */
export function describeIntake(intake: RiskIntake): string {
  const lines = INTAKE_QUESTIONS.map((question) => {
    const labels = labelsFor(question.id, intake[question.id]);
    return `- ${question.label}: ${labels.length > 0 ? labels.join(", ") : "none selected"}`;
  });

  if (intake.note) lines.push(`- Additional context from the auditor: ${intake.note}`);
  return lines.join("\n");
}
