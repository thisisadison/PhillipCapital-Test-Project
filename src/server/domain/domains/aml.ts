import { registerAuditDomain } from "../auditDomain";
import { AML_SOURCE_DOMAINS } from "@/server/service/research/sourceCatalogue";

/**
 * AML / financial crime.
 *
 * The four risk dimensions are MAS's, not ours: a capital markets services
 * licence holder must identify and assess its ML/TF risk having regard to its
 * customers, the products and services it offers, its delivery channels, and
 * the countries it deals with. FATF Recommendation 1 says the same. Asking
 * those four and no others means the intake *is* the risk assessment, in the
 * regulator's own vocabulary.
 *
 * The fifth is ours, and is what makes the output an internal audit programme
 * rather than a compliance walkthrough: where the firm already suspects its
 * controls are weak is where audit effort belongs.
 */
export const AML_DOMAIN = registerAuditDomain({
  id: "aml",
  label: "AML / Financial Crime",
  blurb: "Money laundering and terrorism financing controls, against the MAS Notice that applies to the licence.",
  frameworkNote:
    "The four risk dimensions are the ones MAS requires a capital markets services licence holder to assess its ML/TF risk against, mirrored in FATF Recommendation 1.",
  titlePrefix: "AML/CFT audit",
  titleDimension: "product",

  dimensions: [
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
      colorSlot: null,
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
  ],

  themes: [
    { id: "risk-assessment", label: "Enterprise-wide risk assessment", scope: "Identifying and assessing ML/TF risk across customers, products, channels and countries, and keeping it current." },
    { id: "cdd", label: "Customer due diligence", scope: "Identifying and verifying the customer and any natural person appointed to act, and when CDD must be performed." },
    { id: "beneficial-ownership", label: "Beneficial ownership", scope: "Looking through legal persons and arrangements to the natural persons who ultimately own or control them." },
    { id: "enhanced-dd", label: "Enhanced due diligence", scope: "Additional measures for higher-risk relationships, including source of wealth and source of funds." },
    { id: "peps", label: "Politically exposed persons", scope: "Identifying PEPs, their family members and close associates, and the senior approval and monitoring that follows." },
    { id: "non-face-to-face", label: "Non-face-to-face onboarding", scope: "Safeguards where the customer is not physically present, including any approved digital identity route." },
    { id: "third-party-reliance", label: "Reliance on third parties", scope: "Conditions for relying on an introducer or intermediary for CDD, and the obligation that remains with the firm." },
    { id: "ongoing-monitoring", label: "Ongoing monitoring", scope: "Scrutinising transactions through the life of the relationship, and keeping CDD data current." },
    { id: "sanctions-screening", label: "Sanctions and name screening", scope: "Targeted financial sanctions, screening against designated lists, and acting on a match." },
    { id: "str", label: "Suspicious transaction reporting", scope: "Internal escalation, the MLRO's assessment, filing with the STRO, and tipping-off." },
    { id: "record-keeping", label: "Record keeping", scope: "Retention periods and retrievability for CDD records and transaction data." },
    { id: "governance-training", label: "Governance, audit and training", scope: "Internal policies, the compliance function, the independent audit requirement itself, and staff training." },
  ],

  sourceDomains: AML_SOURCE_DOMAINS,

  riskBrief: [
    "You are a financial crime risk specialist performing the ML/TF risk assessment for a Singapore",
    "capital markets services licence holder, on behalf of its Internal Audit function.",
    "",
    "You return the money-laundering and terrorism-financing risk factors that this particular",
    "combination of customers, products, channels and jurisdictions creates.",
  ].join("\n"),

  obligationsBrief: [
    "The applicable MAS requirements first — the relevant Notice and its paragraphs — then FATF or",
    "Wolfsberg guidance where it adds something MAS does not cover. Prioritise obligations the",
    "profile actually implicates, and ignore obligations for business this firm does not conduct.",
  ].join("\n"),

  scopeBrief:
    "A control area here is a body of AML/CFT control testing an auditor can resource as a unit — for example 'Beneficial ownership identification for introduced corporate accounts', not 'Financial crime'.",

  evidenceBrief: [
    "Evidence in this domain is a document or extract the auditor can request by name: the screening",
    "system's match log, the CDD file, the transaction monitoring rule configuration, the MLRO's",
    "escalation register, the STR filing acknowledgement.",
  ].join("\n"),
});
