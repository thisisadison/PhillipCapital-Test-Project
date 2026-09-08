/**
 * The five sections of the digest.
 *
 * Order is the reading order on the page and the colour-slot order in the
 * charts, so it is deliberate rather than incidental: what the regulator did
 * comes before how the profession is responding to it.
 */
export const CATEGORY_IDS = [
  "regulatory",
  "automation",
  "ai-governance",
  "financial-crime",
  "resilience",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface CategoryDefinition {
  id: CategoryId;
  /** Section heading. */
  label: string;
  /** Compact form for chart legends and filter chips. */
  shortLabel: string;
  /** One line of context under the heading. */
  blurb: string;
  /**
   * Categorical colour slot, 1-indexed, from the validated palette. Fixed per
   * category so a colour always means the same section — it never shifts when
   * a section happens to be empty in a given week.
   */
  colorSlot: 1 | 2 | 3 | 4 | 5;
  /** Steers the research step. Never shown in the UI. */
  researchBrief: string;
}

export const CATEGORIES: readonly CategoryDefinition[] = [
  {
    id: "regulatory",
    label: "Regulatory & Standards",
    shortLabel: "Regulatory",
    blurb: "Supervisory expectations and professional standards that change what audit has to evidence.",
    colorSlot: 1,
    researchBrief: [
      "Regulatory and standard-setter developments that affect internal audit practice.",
      "Prioritise the Monetary Authority of Singapore (MAS) and other Asia-Pacific financial regulators,",
      "then the IIA (Global Internal Audit Standards), ISACA, COSO, IFAC/IAASB, PCAOB, FCA and ESMA.",
      "Look for consultation papers, information papers, guidelines, circulars, enforcement themes and",
      "effective dates that change what an internal audit function must test or evidence.",
    ].join(" "),
  },
  {
    id: "automation",
    label: "Audit Automation & Tooling",
    shortLabel: "Automation",
    blurb: "How audit work is actually getting done — platforms, methods and firm-level capability.",
    colorSlot: 2,
    researchBrief: [
      "Practical developments in how audit and assurance work is executed:",
      "audit automation platforms, continuous auditing and continuous controls monitoring,",
      "analytics-led testing, full-population testing, and agentic or AI-assisted audit tooling.",
      "Prioritise what the Big 4 (KPMG, Deloitte, PwC, EY), RSM, BDO, Grant Thornton and",
      "established audit-technology vendors are shipping or publishing, and credible practitioner",
      "evidence of what works. Skip vendor press releases with no substance behind them.",
    ].join(" "),
  },
  {
    id: "ai-governance",
    label: "AI Risk & Governance",
    shortLabel: "AI Risk",
    blurb: "The control questions audit is now expected to answer about AI in the business.",
    colorSlot: 3,
    researchBrief: [
      "AI risk, assurance and governance as it lands on internal audit's plate:",
      "AI governance frameworks and assurance approaches, model risk management,",
      "third-party and vendor AI risk, AI incidents with control lessons,",
      "and audit's role in assuring AI systems the business has deployed.",
      "Prioritise regulators, standard setters (NIST AI RMF, ISO/IEC 42001), the IIA and ISACA,",
      "and substantive Big 4 research over vendor marketing.",
    ].join(" "),
  },
  {
    id: "financial-crime",
    label: "Financial Crime & Conduct",
    shortLabel: "Fin. Crime",
    blurb: "AML, sanctions, market conduct and fraud — where enforcement is actually landing.",
    colorSlot: 4,
    researchBrief: [
      "Financial crime and conduct developments relevant to a Singapore capital markets and",
      "brokerage business: AML/CFT rules and typologies, sanctions designations and screening",
      "expectations, market conduct and market abuse enforcement, fraud and scam controls,",
      "and client onboarding or KYC obligations.",
      "Prioritise MAS, FATF, the Wolfsberg Group, FinCEN, OFAC, IOSCO and SGX, then enforcement",
      "actions and thematic reviews that reveal what supervisors actually tested.",
    ].join(" "),
  },
  {
    id: "resilience",
    label: "Cyber & Operational Resilience",
    shortLabel: "Resilience",
    blurb: "Technology risk, outsourcing and continuity — the controls audit is asked about after an incident.",
    colorSlot: 5,
    researchBrief: [
      "Cyber security and operational resilience as it affects assurance work:",
      "technology risk management expectations, operational resilience and business continuity",
      "requirements, third-party and cloud concentration risk, major outages or breaches with",
      "control lessons, and incident reporting obligations.",
      "Prioritise MAS (including its Technology Risk Management and Business Continuity guidelines),",
      "CSA Singapore, BIS, ENISA, NCSC, CISA and NIST over vendor threat marketing.",
    ].join(" "),
  },
] as const;

const BY_ID = new Map<CategoryId, CategoryDefinition>(
  CATEGORIES.map((category) => [category.id, category]),
);

export function getCategory(id: CategoryId): CategoryDefinition {
  const category = BY_ID.get(id);
  if (!category) throw new Error(`Unknown digest category: ${id}`);
  return category;
}

export function isCategoryId(value: string): value is CategoryId {
  return BY_ID.has(value as CategoryId);
}

/**
 * Maps whatever the model wrote to a real category id.
 *
 * The API does not enforce enums (see `synthesis/draftSchema.ts`), so
 * "Regulatory", "regulatory & standards" and "AI Risk" all have to land
 * somewhere rather than costing us the entry.
 */
export function resolveCategoryId(raw: string): CategoryId | null {
  const key = raw.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!key) return null;

  for (const category of CATEGORIES) {
    const candidates = [category.id, category.label, category.shortLabel].map((value) =>
      value.toLowerCase().replace(/[^a-z]/g, ""),
    );
    if (candidates.some((candidate) => candidate === key || candidate.startsWith(key) || key.startsWith(candidate))) {
      return category.id;
    }
  }
  return null;
}
