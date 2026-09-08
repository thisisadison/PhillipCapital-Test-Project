/**
 * The digest is deliberately limited to three categories. Adding a fourth is a
 * product decision, not a config change: the whole point of the one-pager is
 * that an auditor can hold the whole shape of it in their head.
 */
export const CATEGORY_IDS = ["regulatory", "automation", "ai-governance"] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface CategoryDefinition {
  id: CategoryId;
  /** Shown as the section heading. */
  label: string;
  /** One line of context under the heading, for readers new to the digest. */
  blurb: string;
  /** Steers the research step. Not shown in the UI. */
  researchBrief: string;
}

export const CATEGORIES: readonly CategoryDefinition[] = [
  {
    id: "regulatory",
    label: "Regulatory & Standards",
    blurb: "Supervisory expectations and professional standards that change what audit has to evidence.",
    researchBrief: [
      "Regulatory and standard-setter developments that affect internal audit practice.",
      "Prioritise the Monetary Authority of Singapore (MAS) and other Asia-Pacific financial regulators,",
      "then the IIA (Global Internal Audit Standards), ISACA, IFAC/IAASB, PCAOB, FCA, ESMA, BIS and IOSCO.",
      "Look for consultation papers, information papers, guidelines, circulars, enforcement themes and",
      "effective dates that change what an internal audit function must test or evidence.",
    ].join(" "),
  },
  {
    id: "automation",
    label: "Audit Automation & Tooling",
    blurb: "How audit work is actually getting done — platforms, methods and firm-level capability.",
    researchBrief: [
      "Practical developments in how audit and assurance work is executed:",
      "audit automation platforms, continuous auditing and continuous controls monitoring,",
      "analytics-led testing, full-population testing, and agentic or AI-assisted audit tooling.",
      "Prioritise what the Big 4 (KPMG, Deloitte, PwC, EY), RSM, BDO, Grant Thornton and",
      "established audit-technology vendors are shipping or publishing, and credible practitioner evidence",
      "of what works. Skip vendor press releases with no substance behind them.",
    ].join(" "),
  },
  {
    id: "ai-governance",
    label: "AI Risk & Governance",
    blurb: "The control questions audit is now expected to answer about AI in the business.",
    researchBrief: [
      "AI risk, assurance and governance as it lands on internal audit's plate:",
      "AI governance frameworks and assurance approaches, model risk management,",
      "third-party and vendor AI risk, AI incidents with control lessons,",
      "and audit's role in assuring AI systems the business has deployed.",
      "Prioritise regulators, standard setters (NIST AI RMF, ISO/IEC 42001), the IIA and ISACA,",
      "and substantive Big 4 research over vendor marketing.",
    ].join(" "),
  },
] as const;

const CATEGORY_BY_ID = new Map<CategoryId, CategoryDefinition>(
  CATEGORIES.map((category) => [category.id, category]),
);

export function getCategory(id: CategoryId): CategoryDefinition {
  const category = CATEGORY_BY_ID.get(id);
  if (!category) {
    throw new Error(`Unknown digest category: ${id}`);
  }
  return category;
}

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORY_BY_ID.has(value as CategoryId);
}
