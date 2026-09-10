import type { AuditDomainId } from "./auditDomain";

/**
 * A worked profile per audit domain, for the form's "use the example" button.
 *
 * Not test fixtures — these are demonstration data, and they live in the domain
 * layer because they have to stay valid against the option catalogues. Each is
 * chosen to produce a programme with something to say: enough exposure across
 * enough dimensions that the Scope Agent has a real merge to perform rather
 * than one obvious answer.
 *
 * `exampleProfiles.test.ts` fails if any id here stops existing.
 */
export const EXAMPLE_PROFILES: Record<AuditDomainId, Record<string, string[]>> = {
  aml: {
    customer: ["retail-non-resident", "corporate", "nominee-structures"],
    product: ["cash-equities", "leveraged-fx-cfd", "third-party-transfers"],
    channel: ["online-platform", "introducers"],
    country: ["asean", "greater-china", "offshore-centres"],
    controls: ["monitoring-stale", "rapid-growth"],
  },
  conduct: {
    customers: ["retail", "accredited", "vulnerable"],
    products: ["listed-securities", "leveraged", "specified-investment"],
    distribution: ["advised", "representatives", "marketing-campaigns"],
    market: ["order-handling", "prop-trading", "pa-dealing"],
    people: ["appointed-reps", "commission-driven", "high-headcount"],
    controls: ["complaints-up", "surveillance-untuned"],
  },
  "client-assets": {
    held: ["customer-money", "customer-securities", "collateral"],
    custody: ["trust-accounts", "own-nominee", "overseas-sub-custodian", "omnibus"],
    movement: ["client-withdrawals", "third-party-payments", "manual-payments"],
    proving: ["daily-computation", "manual-recs", "aged-breaks"],
    disclosure: ["statements", "consent-to-use", "overseas-consent"],
    controls: ["rec-backlog", "system-change"],
  },
  people: {
    workforce: ["appointed-reps", "remisiers", "senior-managers", "work-pass-holders"],
    hiring: ["fit-and-proper", "reference-checks", "agency-hiring"],
    licensing: ["notification", "cpd", "manual-tracking"],
    reward: ["commission", "balanced-scorecard", "sales-targets"],
    exit: ["dismissals", "access-revocation", "references-given"],
    controls: ["register-mismatch", "access-lag"],
  },
  technology: {
    environment: ["core-trading", "customer-apps", "cloud", "vendor-systems"],
    criticality: ["business-critical", "financial-transactions", "customer-data"],
    data: ["personal-data", "financial-data", "cross-border-data"],
    access: ["privileged", "third-party-access", "remote-access"],
    change: ["frequent-releases", "legacy", "migration"],
    controls: ["access-reviews-overdue", "patch-backlog", "dr-untested"],
  },
};
