import type { CategoryId } from "@/server/domain/category";
import type { SourceType } from "@/server/domain/digest";
import { hostnameOf } from "@/shared/url";

/**
 * Source policy.
 *
 * Search is constrained to an allowlist of primary and established secondary
 * sources rather than filtered after the fact. This is the most effective
 * quality lever in the pipeline: an SEO listicle restating a MAS circular can
 * never enter the candidate set, so the synthesis step never has to be asked to
 * prefer the regulator over the aggregator.
 *
 * Each domain also carries its publisher type, which is how every entry gets a
 * trustworthy `sourceType` — that field drives the source-mix chart, so it is
 * derived here rather than asked of the model.
 *
 * The API caps `allowed_domains` at 64 hostnames per request and subdomains are
 * covered by their parent, so each per-category list stays inside that.
 */

type DomainGroup = { type: SourceType; domains: string[] };

const REGULATORS_APAC: DomainGroup = {
  type: "regulator",
  domains: ["mas.gov.sg", "sgx.com", "acra.gov.sg", "hkma.gov.hk", "apra.gov.au", "asic.gov.au"],
};

const REGULATORS_GLOBAL: DomainGroup = {
  type: "regulator",
  domains: [
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
    "finra.org",
  ],
};

const STANDARD_SETTERS: DomainGroup = {
  type: "profession",
  domains: [
    "pcaobus.org",
    "frc.org.uk",
    "ifrs.org",
    "iaasb.org",
    "ifac.org",
    "theiia.org",
    "isaca.org",
    "coso.org",
    "iia.org.uk",
    "aicpa-cima.com",
    "iso.org",
    "nist.gov",
  ],
};

const FIRMS: DomainGroup = {
  type: "firm",
  domains: [
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
  ],
};

const VENDORS: DomainGroup = {
  type: "vendor",
  domains: [
    "auditboard.com",
    "workiva.com",
    "diligent.com",
    "wolterskluwer.com",
    "caseware.com",
    "mindbridge.ai",
    "thomsonreuters.com",
    "servicenow.com",
  ],
};

const PRESS: DomainGroup = {
  type: "press",
  domains: [
    "journalofaccountancy.com",
    "accountingtoday.com",
    "ft.com",
    "reuters.com",
    "businesstimes.com.sg",
    "straitstimes.com",
    "complianceweek.com",
    "cfo.com",
  ],
};

const AI_GOVERNANCE_BODIES: DomainGroup = {
  type: "regulator",
  domains: ["imda.gov.sg", "aiverifyfoundation.sg", "pdpc.gov.sg", "gov.uk", "oecd.org"],
};

const FINANCIAL_CRIME_BODIES: DomainGroup = {
  type: "regulator",
  domains: ["fatf-gafi.org", "fincen.gov", "treasury.gov", "egmontgroup.org", "police.gov.sg"],
};

const FINANCIAL_CRIME_PROFESSION: DomainGroup = {
  type: "profession",
  domains: ["wolfsberg-principles.com", "acams.org"],
};

const RESILIENCE_BODIES: DomainGroup = {
  type: "regulator",
  domains: ["csa.gov.sg", "enisa.europa.eu", "ncsc.gov.uk", "cisa.gov"],
};

const ALL_GROUPS: DomainGroup[] = [
  REGULATORS_APAC,
  REGULATORS_GLOBAL,
  STANDARD_SETTERS,
  FIRMS,
  VENDORS,
  PRESS,
  AI_GOVERNANCE_BODIES,
  FINANCIAL_CRIME_BODIES,
  FINANCIAL_CRIME_PROFESSION,
  RESILIENCE_BODIES,
];

function domainsOf(...groups: DomainGroup[]): string[] {
  return [...new Set(groups.flatMap((group) => group.domains))];
}

/** Domains the research step may draw on, per category. */
export const ALLOWED_DOMAINS_BY_CATEGORY: Record<CategoryId, string[]> = {
  regulatory: domainsOf(REGULATORS_APAC, REGULATORS_GLOBAL, STANDARD_SETTERS, PRESS),
  automation: domainsOf(FIRMS, STANDARD_SETTERS, VENDORS, PRESS),
  "ai-governance": domainsOf(AI_GOVERNANCE_BODIES, STANDARD_SETTERS, FIRMS, REGULATORS_APAC, PRESS),
  "financial-crime": domainsOf(
    FINANCIAL_CRIME_BODIES,
    FINANCIAL_CRIME_PROFESSION,
    REGULATORS_APAC,
    REGULATORS_GLOBAL,
    PRESS,
  ),
  resilience: domainsOf(RESILIENCE_BODIES, REGULATORS_APAC, REGULATORS_GLOBAL, STANDARD_SETTERS, FIRMS, PRESS),
};

/** The API's hard limit on `allowed_domains` entries per request. */
export const MAX_ALLOWED_DOMAINS = 64;

const TYPE_BY_DOMAIN = new Map<string, SourceType>(
  ALL_GROUPS.flatMap((group) => group.domains.map((domain) => [domain, group.type] as const)),
);

/**
 * Classifies a URL by publisher type.
 *
 * Falls back to `press` for anything unrecognised: the allowlist means that
 * should not happen, and treating an unknown as the least authoritative option
 * is the safe direction to be wrong in.
 */
export function classifySource(url: string): SourceType {
  const host = hostnameOf(url);
  if (!host) return "press";

  for (const [domain, type] of TYPE_BY_DOMAIN) {
    if (host === domain || host.endsWith(`.${domain}`)) return type;
  }
  return "press";
}

/** Regulators and standard setters are primary; used to order the source list. */
export function isPrimarySource(url: string): boolean {
  const type = classifySource(url);
  return type === "regulator" || type === "profession";
}
