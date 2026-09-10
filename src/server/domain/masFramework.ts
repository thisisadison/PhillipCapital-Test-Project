/**
 * The obligation themes an AML/CFT audit is expected to cover.
 *
 * These mirror the structure of the MAS Notice that applies to a capital
 * markets services licence holder (SFA04-N02) and the MAS AML/CFT Guidelines
 * that sit under it. They are named themes, never paragraph numbers: the
 * paragraph a requirement actually lives in is retrieved from the instrument at
 * run time by the MAS Agent, because hard-coding a citation is exactly how a
 * tool ends up confidently quoting a notice that has since been reissued.
 *
 * Two jobs. They steer the MAS Agent towards the obligations this profile
 * implicates rather than whatever a search happens to surface, and they let the
 * finished programme show its own coverage — which themes were reached, and
 * which were not. An auditor needs to see the gap, not just the hits.
 */

export const OBLIGATION_THEME_IDS = [
  "risk-assessment",
  "cdd",
  "beneficial-ownership",
  "enhanced-dd",
  "peps",
  "non-face-to-face",
  "third-party-reliance",
  "ongoing-monitoring",
  "sanctions-screening",
  "str",
  "record-keeping",
  "governance-training",
] as const;

export type ObligationThemeId = (typeof OBLIGATION_THEME_IDS)[number];

export interface ObligationTheme {
  id: ObligationThemeId;
  label: string;
  /** What the theme covers, in the vocabulary an auditor would use. */
  scope: string;
}

export const OBLIGATION_THEMES: readonly ObligationTheme[] = [
  {
    id: "risk-assessment",
    label: "Enterprise-wide risk assessment",
    scope: "Identifying and assessing ML/TF risk across customers, products, channels and countries, and keeping it current.",
  },
  {
    id: "cdd",
    label: "Customer due diligence",
    scope: "Identifying and verifying the customer and any natural person appointed to act, and when CDD must be performed.",
  },
  {
    id: "beneficial-ownership",
    label: "Beneficial ownership",
    scope: "Looking through legal persons and arrangements to the natural persons who ultimately own or control them.",
  },
  {
    id: "enhanced-dd",
    label: "Enhanced due diligence",
    scope: "Additional measures for higher-risk relationships, including source of wealth and source of funds.",
  },
  {
    id: "peps",
    label: "Politically exposed persons",
    scope: "Identifying PEPs, their family members and close associates, and the senior approval and monitoring that follows.",
  },
  {
    id: "non-face-to-face",
    label: "Non-face-to-face onboarding",
    scope: "Safeguards where the customer is not physically present, including any approved digital identity route.",
  },
  {
    id: "third-party-reliance",
    label: "Reliance on third parties",
    scope: "Conditions for relying on an introducer or intermediary for CDD, and the obligation that remains with the firm.",
  },
  {
    id: "ongoing-monitoring",
    label: "Ongoing monitoring",
    scope: "Scrutinising transactions through the life of the relationship, and keeping CDD data current.",
  },
  {
    id: "sanctions-screening",
    label: "Sanctions and name screening",
    scope: "Targeted financial sanctions, screening against designated lists, and acting on a match.",
  },
  {
    id: "str",
    label: "Suspicious transaction reporting",
    scope: "Internal escalation, the MLRO's assessment, filing with the STRO, and tipping-off.",
  },
  {
    id: "record-keeping",
    label: "Record keeping",
    scope: "Retention periods and retrievability for CDD records and transaction data.",
  },
  {
    id: "governance-training",
    label: "Governance, audit and training",
    scope: "Internal policies, the compliance function, the independent audit requirement itself, and staff training.",
  },
] as const;

const BY_ID = new Map<ObligationThemeId, ObligationTheme>(
  OBLIGATION_THEMES.map((theme) => [theme.id, theme]),
);

export function getObligationTheme(id: ObligationThemeId): ObligationTheme | null {
  return BY_ID.get(id) ?? null;
}

/**
 * Maps whatever the model wrote onto a real theme id.
 *
 * Structured outputs do not enforce enums — the SDK downgrades them into schema
 * descriptions — so "CDD", "Customer Due Diligence" and "customer_due_diligence"
 * all have to land somewhere. Returning null is a legitimate outcome: an
 * obligation whose theme cannot be resolved is still kept and shown untagged,
 * because the citation is the part that matters and the tag is navigation.
 */
export function resolveThemeId(raw: string): ObligationThemeId | null {
  const key = normalise(raw);
  if (!key) return null;

  for (const theme of OBLIGATION_THEMES) {
    if (normalise(theme.id) === key || normalise(theme.label) === key) return theme.id;
  }
  // Substring match second, so an exact id never loses to a longer label.
  for (const theme of OBLIGATION_THEMES) {
    const label = normalise(theme.label);
    if (label.includes(key) || key.includes(normalise(theme.id))) return theme.id;
  }
  return null;
}

/** The catalogue as it appears in the MAS Agent's brief. */
export function formatThemes(): string {
  return OBLIGATION_THEMES.map((theme) => `- \`${theme.id}\` ${theme.label} — ${theme.scope}`).join(
    "\n",
  );
}

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z]/g, "");
}
