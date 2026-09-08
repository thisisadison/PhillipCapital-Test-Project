import type { CategoryId } from "./categories";

/**
 * Source policy.
 *
 * Search is constrained to an allowlist of primary and established secondary
 * sources rather than filtered after the fact. This is the single most
 * effective quality lever in the pipeline: an SEO listicle restating a MAS
 * circular can never enter the candidate set, so the synthesis step never has
 * to be asked to prefer the regulator over the aggregator.
 *
 * The API caps `allowed_domains` at 64 hostnames per request, and subdomains
 * are covered by their parent, so each per-category list stays well inside it.
 */

/** Regulators, standard setters and professional bodies. */
const REGULATORS_AND_STANDARDS = [
  "mas.gov.sg",
  "sgx.com",
  "acra.gov.sg",
  "hkma.gov.hk",
  "apra.gov.au",
  "asic.gov.au",
  "bis.org",
  "iosco.org",
  "fca.org.uk",
  "bankofengland.co.uk",
  "esma.europa.eu",
  "eba.europa.eu",
  "europa.eu",
  "sec.gov",
  "federalreserve.gov",
  "occ.gov",
  "pcaobus.org",
  "frc.org.uk",
  "ifrs.org",
  "iaasb.org",
  "ifac.org",
];

/** Bodies that set or interpret internal audit practice specifically. */
const AUDIT_PROFESSION = ["theiia.org", "isaca.org", "coso.org", "iia.org.uk", "aicpa-cima.com"];

/** Firms whose insight pages are primary sources for what practice looks like. */
const PROFESSIONAL_SERVICES_FIRMS = [
  "kpmg.com",
  "deloitte.com",
  "pwc.com",
  "ey.com",
  "rsm.global",
  "rsmus.com",
  "bdo.global",
  "grantthornton.global",
  "protiviti.com",
  "crowe.com",
  "mazars.com",
];

/** Established trade press. Included for coverage, never as the only source. */
const TRADE_PRESS = [
  "journalofaccountancy.com",
  "accountingtoday.com",
  "ft.com",
  "reuters.com",
  "economist.com",
  "businesstimes.com.sg",
  "straitstimes.com",
  "cfo.com",
  "complianceweek.com",
];

/** Audit and GRC technology vendors — substantive product and research pages. */
const AUDIT_TECHNOLOGY_VENDORS = [
  "auditboard.com",
  "workiva.com",
  "diligent.com",
  "wolterskluwer.com",
  "caseware.com",
  "mindbridge.ai",
  "thomsonreuters.com",
  "sap.com",
  "servicenow.com",
];

/** AI governance frameworks, assurance schemes and policy bodies. */
const AI_GOVERNANCE_BODIES = [
  "nist.gov",
  "iso.org",
  "oecd.org",
  "imda.gov.sg",
  "aiverifyfoundation.sg",
  "pdpc.gov.sg",
  "gov.uk",
  "nvlpubs.nist.gov",
  "iapp.org",
  "weforum.org",
  "cisa.gov",
];

function dedupe(...groups: string[][]): string[] {
  return [...new Set(groups.flat())];
}

/**
 * Domains the research step is allowed to draw on, per category.
 */
export const ALLOWED_DOMAINS_BY_CATEGORY: Record<CategoryId, string[]> = {
  regulatory: dedupe(REGULATORS_AND_STANDARDS, AUDIT_PROFESSION, TRADE_PRESS),
  automation: dedupe(
    PROFESSIONAL_SERVICES_FIRMS,
    AUDIT_PROFESSION,
    AUDIT_TECHNOLOGY_VENDORS,
    TRADE_PRESS,
  ),
  "ai-governance": dedupe(
    AI_GOVERNANCE_BODIES,
    AUDIT_PROFESSION,
    PROFESSIONAL_SERVICES_FIRMS,
    REGULATORS_AND_STANDARDS,
    TRADE_PRESS,
  ),
};

/** The API's hard limit on `allowed_domains` entries per request. */
export const MAX_ALLOWED_DOMAINS = 64;

/**
 * Domains we treat as primary. Used to warn when an edition leans too heavily
 * on trade press — it does not filter, because a good trade-press piece on a
 * development with no primary write-up is still worth carrying.
 */
const PRIMARY_DOMAINS = new Set(
  dedupe(
    REGULATORS_AND_STANDARDS,
    AUDIT_PROFESSION,
    PROFESSIONAL_SERVICES_FIRMS,
    AI_GOVERNANCE_BODIES,
  ),
);

export function isPrimarySource(url: string): boolean {
  const host = hostnameOf(url);
  if (!host) return false;

  return [...PRIMARY_DOMAINS].some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
