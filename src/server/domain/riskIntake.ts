import { z } from "zod";

/**
 * The risk intake, structured as MAS structures a risk assessment.
 *
 * The four required dimensions are not our invention: MAS requires a capital
 * markets services licence holder to identify and assess its ML/TF risk having
 * regard to its customers, the products and services it offers, its delivery
 * channels, and the countries it deals with. FATF Recommendation 1 says the
 * same. Asking the auditor those four questions and no others means the intake
 * *is* the risk assessment, in the regulator's own vocabulary — so the
 * programme that comes out of it can be defended to a supervisor as risk-based
 * rather than merely thorough.
 *
 * The fifth dimension is ours, and is what makes this an *internal audit*
 * programme rather than a compliance walkthrough: where the firm already
 * suspects its controls are weak is where audit effort belongs.
 *
 * Checkboxes, not a blank box. A blank box is the interface of a chat — it puts
 * the whole burden of knowing what matters on the auditor, and gives the
 * pipeline nothing it can trace a conclusion back to. A fixed vocabulary is
 * what lets every risk factor name the answer that produced it.
 */

export const DIMENSION_IDS = [
  "customer",
  "product",
  "channel",
  "country",
  "controls",
] as const;

export type DimensionId = (typeof DIMENSION_IDS)[number];

export interface IntakeOption {
  id: string;
  label: string;
  /** Shown under the label where the option's audit relevance is not obvious. */
  hint?: string;
}

export interface IntakeQuestion {
  id: DimensionId;
  label: string;
  help: string;
  /**
   * Categorical colour slot, 1-indexed, from the validated palette. Fixed per
   * dimension for the life of the product, so a colour always means the same
   * risk dimension — on the intake card, on the risk factor it produced, and on
   * the scope area that answers it.
   */
  colorSlot: 1 | 2 | 3 | 4 | 5;
  /** Required dimensions are the four MAS assesses; `controls` is ours and optional. */
  required: boolean;
  options: readonly IntakeOption[];
}

export const INTAKE_QUESTIONS: readonly IntakeQuestion[] = [
  {
    id: "customer",
    label: "Customer risk",
    help: "Who the firm onboards. The single biggest driver of due-diligence obligations.",
    colorSlot: 1,
    required: true,
    options: [
      { id: "retail-sg", label: "Retail individuals, Singapore-resident" },
      { id: "retail-non-resident", label: "Non-resident individuals", hint: "Raises jurisdiction and verification risk" },
      { id: "accredited", label: "Accredited and high-net-worth investors" },
      { id: "corporate", label: "Corporate and institutional clients" },
      { id: "nominee-structures", label: "Trusts, foundations and nominee structures", hint: "Beneficial ownership look-through" },
      { id: "peps", label: "Politically exposed persons", hint: "Mandatory enhanced due diligence" },
      { id: "fi-counterparties", label: "Financial institutions as counterparties" },
    ],
  },
  {
    id: "product",
    label: "Product and service risk",
    help: "What the firm offers. Determines which obligations apply at all, and where value can move.",
    colorSlot: 2,
    required: true,
    options: [
      { id: "cash-equities", label: "Securities dealing (cash equities)" },
      { id: "futures-derivatives", label: "Futures and derivatives dealing" },
      { id: "leveraged-fx-cfd", label: "Leveraged FX and CFDs", hint: "High turnover, low transparency" },
      { id: "collective-schemes", label: "Unit trusts and collective investment schemes" },
      { id: "custody-nominee", label: "Custody and nominee services" },
      { id: "securities-financing", label: "Securities financing and margin lending" },
      { id: "fund-management", label: "Fund management and managed accounts" },
      { id: "third-party-transfers", label: "Third-party fund transfers or withdrawals", hint: "Classic layering route" },
    ],
  },
  {
    id: "channel",
    label: "Delivery channel risk",
    help: "How clients arrive and transact. Determines who performs the due diligence and who holds the evidence.",
    colorSlot: 3,
    required: true,
    options: [
      { id: "online-platform", label: "Online and mobile trading platform", hint: "Non-face-to-face safeguards apply" },
      { id: "in-person", label: "Branch or in-person onboarding" },
      { id: "trading-reps", label: "Remisiers and trading representatives", hint: "Commission-driven onboarding" },
      { id: "introducers", label: "Third-party introducers and referral agents", hint: "Reliance on another party's CDD" },
      { id: "group-entities", label: "Onboarding by overseas group entities" },
      { id: "institutional-api", label: "Institutional order flow via API or DMA" },
    ],
  },
  {
    id: "country",
    label: "Country and jurisdiction risk",
    help: "Where clients are based and where money moves. Drives enhanced due diligence and sanctions exposure.",
    colorSlot: 4,
    required: true,
    options: [
      { id: "singapore", label: "Singapore only" },
      { id: "asean", label: "ASEAN markets" },
      { id: "greater-china", label: "Greater China", hint: "Hong Kong, PRC, Taiwan" },
      { id: "offshore-centres", label: "Offshore financial centres", hint: "BVI, Cayman, Seychelles and similar" },
      { id: "fatf-grey", label: "FATF grey-list jurisdictions", hint: "Increased monitoring" },
      { id: "fatf-blacklist", label: "FATF call-for-action jurisdictions", hint: "Countermeasures required" },
      { id: "sanctioned", label: "Sanctioned or embargoed jurisdictions" },
    ],
  },
  {
    id: "controls",
    label: "Known control weaknesses",
    help: "Where you already suspect the controls are thin. This is what makes the programme an audit rather than a walkthrough.",
    colorSlot: 5,
    required: false,
    options: [
      { id: "manual-screening", label: "Name screening is manual or spreadsheet-based" },
      { id: "monitoring-stale", label: "Monitoring rules not tuned in the last 12 months" },
      { id: "ewra-overdue", label: "Enterprise-wide risk assessment overdue" },
      { id: "cdd-backlog", label: "Periodic CDD review backlog on existing clients" },
      { id: "prior-findings", label: "Prior AML findings or inspection issues still open" },
      { id: "rapid-growth", label: "Rapid growth in new account opening" },
      { id: "outsourced-aml", label: "AML operations outsourced to group or a vendor" },
      { id: "mlro-turnover", label: "High turnover in compliance or the MLRO function" },
      { id: "single-list-vendor", label: "Screening depends on a single vendor list" },
    ],
  },
] as const;

const QUESTION_BY_ID = new Map<DimensionId, IntakeQuestion>(
  INTAKE_QUESTIONS.map((question) => [question.id, question]),
);

const OPTION_IDS = new Map<DimensionId, Set<string>>(
  INTAKE_QUESTIONS.map((question) => [
    question.id,
    new Set(question.options.map((option) => option.id)),
  ]),
);

export const riskIntakeSchema = z.object({
  customer: z.array(z.string()).min(1, "Select at least one customer type"),
  product: z.array(z.string()).min(1, "Select at least one product or service"),
  channel: z.array(z.string()).min(1, "Select at least one delivery channel"),
  country: z.array(z.string()).min(1, "Select at least one jurisdiction"),
  /** Ours, not MAS's — genuinely optional. */
  controls: z.array(z.string()),
  /** Optional. A programme can be produced from the selections alone. */
  note: z.string().max(1000).optional(),
});

export type RiskIntake = z.infer<typeof riskIntakeSchema>;

/** Drops anything not in the option catalogue, so a crafted payload cannot inject prompt text. */
export function sanitiseIntake(intake: RiskIntake): RiskIntake {
  const keep = (questionId: DimensionId, values: string[]) =>
    values.filter((value) => OPTION_IDS.get(questionId)?.has(value)).slice(0, 20);

  return {
    customer: keep("customer", intake.customer),
    product: keep("product", intake.product),
    channel: keep("channel", intake.channel),
    country: keep("country", intake.country),
    controls: keep("controls", intake.controls),
    ...(intake.note?.trim() ? { note: intake.note.trim().slice(0, 1000) } : {}),
  };
}

export function getQuestion(id: DimensionId): IntakeQuestion | null {
  return QUESTION_BY_ID.get(id) ?? null;
}

/** Human-readable labels for a set of selected option ids. */
export function labelsFor(questionId: DimensionId, ids: string[]): string[] {
  const question = QUESTION_BY_ID.get(questionId);
  if (!question) return [];

  return ids.flatMap((id) => {
    const option = question.options.find((entry) => entry.id === id);
    return option ? [option.label] : [];
  });
}

/**
 * Maps whatever the model wrote onto a real dimension id.
 *
 * Same reason as `resolveThemeId`: the API does not enforce enums, so a risk
 * factor tagged "Customer Risk" or "delivery_channel" still has to land on the
 * right dimension rather than costing us the factor.
 */
export function resolveDimensionId(raw: string): DimensionId | null {
  const key = raw.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!key) return null;

  for (const question of INTAKE_QUESTIONS) {
    if (question.id === key) return question.id;
  }
  for (const question of INTAKE_QUESTIONS) {
    const label = question.label.toLowerCase().replace(/[^a-z]/g, "");
    if (label.includes(key) || key.includes(question.id)) return question.id;
  }
  return null;
}

/** The intake rendered for a prompt — labels, not ids, so the model reads plain English. */
export function describeIntake(intake: RiskIntake): string {
  const lines = INTAKE_QUESTIONS.map((question) => {
    const labels = labelsFor(question.id, intake[question.id]);
    return `- ${question.label} (\`${question.id}\`): ${
      labels.length > 0 ? labels.join(", ") : "none selected"
    }`;
  });

  if (intake.note) lines.push(`- Additional context from the auditor: ${intake.note}`);
  return lines.join("\n");
}

/** Total selections made, for the run record. */
export function countSelections(intake: RiskIntake): number {
  return INTAKE_QUESTIONS.reduce((total, question) => total + intake[question.id].length, 0);
}
