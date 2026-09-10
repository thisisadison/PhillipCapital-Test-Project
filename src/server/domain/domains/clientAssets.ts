import { registerAuditDomain } from "../auditDomain";
import { MARKETS_CONDUCT_SOURCE_DOMAINS } from "@/server/service/research/sourceCatalogue";

/**
 * Client assets and customer money.
 *
 * The signature audit of a brokerage, and the one whose absence an audit
 * committee would notice first. A capital markets services licence holder holds
 * money and securities that are not its own, and the Securities and Futures Act
 * and its Licensing and Conduct of Business Regulations set out how they must be
 * segregated, held, computed, reconciled and reported. Failures here are not
 * control weaknesses to be improved at leisure — they are the failures that end
 * licences, because the money is gone before anyone notices the reconciliation
 * stopped balancing.
 *
 * The dimensions are the shape of the custody problem rather than an invention:
 * what is held, where it sits, how it moves, how often it is proven, and what
 * the client was told and agreed to.
 */
export const CLIENT_ASSETS_DOMAIN = registerAuditDomain({
  id: "client-assets",
  label: "Client Assets & Money",
  blurb: "Segregation, custody, reconciliation and reporting of money and assets that belong to customers.",
  frameworkNote:
    "The dimensions follow the customer money and customer assets provisions of the Securities and Futures Act and its Licensing and Conduct of Business Regulations, and the MAS notices on statements and disclosures that sit alongside them.",
  titlePrefix: "Client assets audit",
  titleDimension: "held",

  dimensions: [
    {
      id: "held",
      label: "What is held",
      help: "What the firm holds that is not its own. Determines which parts of the regime apply at all.",
      colorSlot: 1,
      required: true,
      options: [
        { id: "customer-money", label: "Customer money" },
        { id: "customer-securities", label: "Customer securities and assets" },
        { id: "collateral", label: "Collateral pledged by customers", hint: "Use and re-use conditions" },
        { id: "margin-deposits", label: "Margin deposits" },
        { id: "cpf-srs", label: "CPF and SRS monies", hint: "Additional statutory conditions" },
        { id: "foreign-currency", label: "Foreign currency balances" },
        { id: "digital-assets", label: "Digital assets" },
        { id: "unclaimed", label: "Dormant or unclaimed balances", hint: "Often the oldest reconciling items" },
      ],
    },
    {
      id: "custody",
      label: "Where it is held",
      help: "The custody chain. Every link is somewhere the firm's control can stop and someone else's begins.",
      colorSlot: 2,
      required: true,
      options: [
        { id: "trust-accounts", label: "Trust or customer accounts at local banks" },
        { id: "own-nominee", label: "The firm's own nominee company" },
        { id: "cdp", label: "CDP or local depository accounts" },
        { id: "third-party-custodian", label: "Third-party custodians" },
        { id: "overseas-sub-custodian", label: "Overseas sub-custodians", hint: "Foreign insolvency law applies" },
        { id: "omnibus", label: "Omnibus accounts", hint: "Individual entitlement depends on the firm's own records" },
        { id: "group-entity", label: "Group entities in other jurisdictions" },
      ],
    },
    {
      id: "movement",
      label: "How it moves",
      help: "Every path by which value leaves. Most client asset losses are a payment that should not have been made.",
      colorSlot: 3,
      required: true,
      options: [
        { id: "client-withdrawals", label: "Customer-initiated withdrawals" },
        { id: "third-party-payments", label: "Payments to third parties", hint: "Highest-risk outward path" },
        { id: "internal-transfers", label: "Transfers between customer and firm accounts" },
        { id: "manual-payments", label: "Manual or offline payment instructions" },
        { id: "asset-transfers", label: "Securities transfers and deliveries" },
        { id: "corporate-actions", label: "Corporate action proceeds and entitlements" },
        { id: "staff-authority", label: "Staff with standalone payment authority" },
        { id: "auto-sweeps", label: "Automated sweeps between accounts" },
      ],
    },
    {
      id: "proving",
      label: "Computation and reconciliation",
      help: "How often, and how reliably, the firm proves it still holds what it owes. This is the control that fails silently.",
      colorSlot: 4,
      required: true,
      options: [
        { id: "daily-computation", label: "Daily computation of customer money" },
        { id: "periodic-computation", label: "Less frequent than daily", hint: "Longer window before a shortfall shows" },
        { id: "asset-reconciliation", label: "Reconciliation of customer assets to custodian records" },
        { id: "manual-recs", label: "Reconciliation is manual or spreadsheet-based" },
        { id: "aged-breaks", label: "Aged or unresolved reconciling items" },
        { id: "shortfall-funding", label: "Shortfalls funded from the firm's own money" },
        { id: "no-independent-review", label: "Reconciliations not independently reviewed" },
      ],
    },
    {
      id: "disclosure",
      label: "Client agreements and reporting",
      help: "What the customer was told, agreed to, and can see. Consent is what makes some uses of their assets lawful.",
      colorSlot: 5,
      required: true,
      options: [
        { id: "statements", label: "Periodic statements to customers" },
        { id: "risk-disclosures", label: "Risk disclosure documents" },
        { id: "consent-to-use", label: "Customer consent to use or pledge assets", hint: "Consent defines the boundary" },
        { id: "overseas-consent", label: "Consent to hold assets overseas" },
        { id: "terms-updates", label: "Terms varied during the period" },
        { id: "online-portal", label: "Holdings shown through an online portal" },
      ],
    },
    {
      id: "controls",
      label: "Known control weaknesses",
      help: "Where you already suspect the controls are thin. This is what makes the programme an audit rather than a walkthrough.",
      colorSlot: null,
      required: false,
      options: [
        { id: "prior-findings", label: "Prior client asset findings still open" },
        { id: "past-shortfall", label: "A shortfall or breach occurred in the period" },
        { id: "rec-backlog", label: "Reconciliation backlog" },
        { id: "system-change", label: "Back-office or custody system changed recently" },
        { id: "ops-turnover", label: "High turnover in operations or settlements" },
        { id: "no-attestation", label: "No periodic attestation to the board" },
        { id: "auditor-findings", label: "External auditor raised client asset issues" },
        { id: "manual-workarounds", label: "Known manual workarounds in the asset process" },
      ],
    },
  ],

  themes: [
    { id: "segregation", label: "Segregation of customer money", scope: "Keeping customer money separate from the firm's own, and the deadlines for depositing it." },
    { id: "trust-accounts", label: "Trust account arrangements", scope: "Where customer money may be held, and the acknowledgements required from the institution holding it." },
    { id: "asset-custody", label: "Custody of customer assets", scope: "How customer securities and assets must be held, registered and identified as belonging to customers." },
    { id: "computation", label: "Computation of customer money", scope: "Calculating what is owed to customers against what is held, and the frequency required." },
    { id: "reconciliation", label: "Reconciliation", scope: "Reconciling internal records to custodian and bank records, and resolving differences." },
    { id: "shortfall", label: "Shortfalls and remediation", scope: "Identifying a deficiency, funding it, and notifying the regulator." },
    { id: "withdrawals", label: "Withdrawals and payments", scope: "Conditions under which money or assets may leave, and the authorisation required." },
    { id: "use-of-assets", label: "Use of customer assets", scope: "Pledging, lending or otherwise using customer assets, and the consent that permits it." },
    { id: "overseas-custody", label: "Overseas and third-party custody", scope: "Due diligence on custodians, and the disclosures required before assets are held abroad." },
    { id: "statements", label: "Statements and reporting", scope: "What must be reported to customers about their holdings, and how often." },
    { id: "disclosures-consent", label: "Disclosures and consent", scope: "Risk disclosures and written consent in customer agreements." },
    { id: "unclaimed", label: "Dormant and unclaimed balances", scope: "Treatment of balances the firm can no longer return to an identified customer." },
    { id: "record-keeping", label: "Entitlement records", scope: "Retention and retrievability of the records that evidence which customer owns what." },
    { id: "governance", label: "Governance and oversight", scope: "Board and senior management oversight of client assets, including attestation and the independent audit requirement." },
  ],

  sourceDomains: MARKETS_CONDUCT_SOURCE_DOMAINS,

  riskBrief: [
    "You are a client assets specialist assessing a Singapore capital markets services licence",
    "holder on behalf of its Internal Audit function.",
    "",
    "You return the risk factors that this custody arrangement creates — the ways customer money or",
    "assets could be misapplied, left unsegregated, lost in the custody chain, paid to the wrong",
    "party, or found short at a point when nobody was looking.",
    "",
    "Weight your assessment towards the paths by which value actually leaves, and towards the",
    "controls that fail silently: a reconciliation that stopped balancing months ago is a larger",
    "exposure than one that never existed, because the firm believes it is covered.",
  ].join("\n"),

  obligationsBrief: [
    "The customer money and customer assets provisions of the Securities and Futures Act and its",
    "Licensing and Conduct of Business Regulations first, then the MAS notices and guidelines on",
    "statements, disclosures and reporting that sit alongside them, then the exchange and depository",
    "rules where the firm clears or holds through them. Be precise about which obligations attach to",
    "money and which to assets — they are different regimes with different deadlines, and conflating",
    "them produces a programme that tests the wrong thing.",
  ].join("\n"),

  scopeBrief:
    "A control area here is usually one link in the custody chain or one control that proves it — for example 'Daily computation of customer money and shortfall escalation', not 'Client assets'.",

  evidenceBrief: [
    "Evidence in this domain is the reconciliation itself and the records behind it: the customer",
    "money computation with its supporting ledger, bank and custodian statements obtained directly",
    "rather than from the firm's own files, trust account acknowledgement letters, the nominee",
    "register, payment authorisation records, signed customer agreements evidencing consent, and",
    "the aged breaks listing. Where entitlement is the question, obtain both sides independently —",
    "a reconciliation the firm prepared proves less than one the auditor can reperform.",
  ].join("\n"),
});
