import { z } from "zod";

/**
 * An audit domain: one kind of audit the function performs.
 *
 * Internal Audit is not a department that audits itself — it audits the whole
 * firm. AML is one item on an annual plan that also carries technology,
 * operations, finance and conduct work. So the tool cannot be an AML tool with
 * AML questions hard-coded into it; the framework has to be data.
 *
 * Every domain supplies the same four things, and that uniformity is what lets
 * one pipeline serve all of them:
 *
 *  - `dimensions`   — the risk-assessment questions, ideally lifted from a
 *                     framework the regulator or the profession already
 *                     recognises rather than invented here. That provenance is
 *                     what lets the resulting programme be defended as
 *                     risk-based rather than merely thorough.
 *  - `themes`       — the obligation areas an audit of this kind is expected to
 *                     reach, so coverage can be reported honestly.
 *  - `sourceDomains`— where obligations may be read from.
 *  - the briefs     — the domain-specific paragraphs the agents need.
 *
 * Adding an audit type is therefore a config file, not a rewrite. That is the
 * whole point of this file existing.
 */

export const AUDIT_DOMAIN_IDS = [
  "aml",
  "conduct",
  "client-assets",
  "technology",
] as const;
export type AuditDomainId = (typeof AUDIT_DOMAIN_IDS)[number];

export const auditDomainIdSchema = z.enum(AUDIT_DOMAIN_IDS);

export interface IntakeOption {
  id: string;
  label: string;
  /** Shown under the label where the option's audit relevance is not obvious. */
  hint?: string;
}

/**
 * Colour slots come from the validated categorical palette, which has five.
 *
 * Only *risk* dimensions take one. The control-weakness dimension every domain
 * carries is deliberately colourless: it is not an inherent risk dimension of
 * the business, it is the firm's own assessment of its control state, and
 * giving it a neutral rule rather than a sixth hue says so. It also keeps every
 * domain inside the five slots that were actually checked for contrast and
 * colour-vision separation.
 */
export type ColorSlot = 1 | 2 | 3 | 4 | 5;

export interface IntakeDimension {
  id: string;
  label: string;
  help: string;
  /** Null for the control-weakness dimension — see `ColorSlot`. */
  colorSlot: ColorSlot | null;
  /**
   * Required dimensions are the ones the domain's framework actually mandates.
   * An assessment missing one of those cannot be defended as the assessment the
   * framework asks for, so the form refuses to proceed rather than inferring it.
   */
  required: boolean;
  options: readonly IntakeOption[];
}

export interface ObligationTheme {
  id: string;
  label: string;
  /** What the theme covers, in the vocabulary an auditor would use. */
  scope: string;
}

export interface AuditDomain {
  id: AuditDomainId;
  /** Shown on the audit-type picker. */
  label: string;
  /** One line under the label, saying what this audit covers. */
  blurb: string;
  /**
   * The framework the dimensions are lifted from, named so the auditor can
   * check the provenance rather than take our word for it.
   */
  frameworkNote: string;
  /** Prefix for a generated programme's title, e.g. "AML/CFT audit". */
  titlePrefix: string;
  /** Which dimension names the programme, since business lines vary by domain. */
  titleDimension: string;

  dimensions: readonly IntakeDimension[];
  themes: readonly ObligationTheme[];
  /** Hostnames the obligations agent may search. Capped at 64 by the API. */
  sourceDomains: readonly string[];

  /** Who the risk agent is, and what it is assessing. */
  riskBrief: string;
  /** Who the obligations agent is, and which instruments it should reach for. */
  obligationsBrief: string;
  /** What a "control area" means in this domain, for the scope agent. */
  scopeBrief: string;
  /** What good evidence looks like here — the examples differ sharply by domain. */
  evidenceBrief: string;
}

const REGISTRY = new Map<AuditDomainId, AuditDomain>();

/** Registered by each domain module at import; see `domains/index.ts`. */
export function registerAuditDomain(domain: AuditDomain): AuditDomain {
  REGISTRY.set(domain.id, domain);
  return domain;
}

export function getAuditDomain(id: AuditDomainId): AuditDomain {
  const domain = REGISTRY.get(id);
  if (!domain) throw new Error(`Unknown audit domain: ${id}`);
  return domain;
}

export function isAuditDomainId(value: string): value is AuditDomainId {
  return (AUDIT_DOMAIN_IDS as readonly string[]).includes(value);
}

/** Every registered domain, in the order the ids are declared. */
export function allAuditDomains(): AuditDomain[] {
  return AUDIT_DOMAIN_IDS.map((id) => getAuditDomain(id));
}

export function getDimension(domain: AuditDomain, id: string): IntakeDimension | null {
  return domain.dimensions.find((dimension) => dimension.id === id) ?? null;
}

export function getTheme(domain: AuditDomain, id: string): ObligationTheme | null {
  return domain.themes.find((theme) => theme.id === id) ?? null;
}

/**
 * Where a risk factor goes when the model tags it with something unplaceable.
 *
 * Every domain carries exactly one colourless dimension — the firm's own
 * control weaknesses — and that is the honest home for an unresolvable tag: it
 * is the one dimension that is ours rather than the framework's, so landing
 * there overstates nothing about coverage of a mandated dimension.
 */
export function fallbackDimension(domain: AuditDomain): IntakeDimension {
  const colourless = domain.dimensions.find((dimension) => dimension.colorSlot === null);
  if (!colourless) {
    throw new Error(`Domain ${domain.id} has no colourless control dimension to fall back to.`);
  }
  return colourless;
}

/**
 * Maps whatever a model wrote onto a real dimension id.
 *
 * Structured outputs do not enforce enums — the SDK downgrades them into schema
 * descriptions — so "Customer Risk", "delivery_channel" and "Access & security"
 * all have to land somewhere rather than costing us the factor. Returns null
 * when nothing matches; callers decide what an unplaceable answer means.
 */
export function resolveDimensionId(domain: AuditDomain, raw: string): string | null {
  return resolveAgainst(
    raw,
    domain.dimensions.map((dimension) => [dimension.id, dimension.label]),
  );
}

/** Same, for obligation themes. A null theme is kept and shown untagged. */
export function resolveThemeId(domain: AuditDomain, raw: string): string | null {
  return resolveAgainst(
    raw,
    domain.themes.map((theme) => [theme.id, theme.label]),
  );
}

function resolveAgainst(raw: string, entries: [string, string][]): string | null {
  const key = normalise(raw);
  if (!key) return null;

  // Exact first, so a short id never loses to a longer label that contains it.
  for (const [id, label] of entries) {
    if (normalise(id) === key || normalise(label) === key) return id;
  }
  for (const [id, label] of entries) {
    if (normalise(label).includes(key) || key.includes(normalise(id))) return id;
  }
  return null;
}

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z]/g, "");
}
