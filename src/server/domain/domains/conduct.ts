import { registerAuditDomain } from "../auditDomain";
import { MARKETS_CONDUCT_SOURCE_DOMAINS } from "@/server/service/research/sourceCatalogue";

/**
 * Regulatory compliance and business conduct.
 *
 * The audit that asks whether the firm treats its customers and the market
 * properly: whether advice was suitable, whether orders were executed in the
 * customer's interest, whether the people giving advice were licensed and
 * competent to, and whether anyone traded on something they should not have.
 *
 * The dimensions are drawn from where the obligations actually attach. Almost
 * every conduct requirement in Singapore turns on a small number of facts —
 * which customer segment, which product, through which distribution model, and
 * by whom — so those are the questions. A retail customer sold a complex
 * leveraged product by a commissioned representative is a different regulatory
 * position from an institutional client trading execution-only, and the
 * programme has to reflect that rather than average across it.
 */
export const CONDUCT_DOMAIN = registerAuditDomain({
  id: "conduct",
  label: "Compliance & Conduct",
  blurb: "Fair dealing, suitability, best execution, market conduct and the licensing of representatives.",
  frameworkNote:
    "The dimensions follow where Singapore's conduct obligations actually attach — customer segment, product, distribution model and the people involved — under the Securities and Futures Act, the Financial Advisers Act, the MAS Guidelines on Fair Dealing and the Guidelines on Individual Accountability and Conduct.",
  titlePrefix: "Conduct audit",
  titleDimension: "products",

  dimensions: [
    {
      id: "customers",
      label: "Customer segments",
      help: "Who the firm deals with. Retail protections are the strictest and fall away as the customer becomes more sophisticated.",
      colorSlot: 1,
      required: true,
      options: [
        { id: "retail", label: "Retail customers", hint: "Full suite of retail protections" },
        { id: "accredited", label: "Accredited investors", hint: "Opt-in and opt-out obligations" },
        { id: "expert", label: "Expert investors" },
        { id: "institutional", label: "Institutional investors" },
        { id: "vulnerable", label: "Elderly or vulnerable customers", hint: "Heightened safeguards" },
        { id: "overseas-clients", label: "Customers outside Singapore", hint: "Other regulators' rules may bite" },
      ],
    },
    {
      id: "products",
      label: "Products and services",
      help: "What is sold. Complexity and leverage are what turn a sale into a suitability problem.",
      colorSlot: 2,
      required: true,
      options: [
        { id: "listed-securities", label: "Listed securities" },
        { id: "unit-trusts", label: "Unit trusts and funds" },
        { id: "specified-investment", label: "Specified investment products", hint: "Customer knowledge assessment applies" },
        { id: "leveraged", label: "Leveraged products and CFDs", hint: "Loss and margin disclosure" },
        { id: "structured", label: "Structured products" },
        { id: "discretionary", label: "Discretionary portfolio management" },
        { id: "research", label: "Research and recommendations" },
        { id: "new-products", label: "Products launched in the period" },
      ],
    },
    {
      id: "distribution",
      label: "Advice and distribution",
      help: "How it reaches the customer. Determines whether suitability obligations apply, and to whom.",
      colorSlot: 3,
      required: true,
      options: [
        { id: "execution-only", label: "Execution-only" },
        { id: "advised", label: "Advised sales", hint: "Suitability and reasonable basis" },
        { id: "digital-advisory", label: "Digital or automated advice" },
        { id: "representatives", label: "Face-to-face through representatives" },
        { id: "third-party-distributors", label: "Third-party distributors" },
        { id: "marketing-campaigns", label: "Marketing and promotional campaigns" },
        { id: "cross-border-solicitation", label: "Cross-border solicitation" },
      ],
    },
    {
      id: "market",
      label: "Market-facing activity",
      help: "How the firm behaves in the market and handles orders. Where conflicts between the firm and its customers live.",
      colorSlot: 4,
      required: true,
      options: [
        { id: "order-handling", label: "Customer order handling and allocation" },
        { id: "best-execution", label: "Execution across multiple venues", hint: "Best execution policy and monitoring" },
        { id: "prop-trading", label: "Proprietary trading alongside customer flow", hint: "Front-running exposure" },
        { id: "market-making", label: "Market making or principal dealing" },
        { id: "pa-dealing", label: "Staff personal account dealing" },
        { id: "research-conflicts", label: "Research produced alongside dealing" },
        { id: "surveillance", label: "Trade surveillance for market abuse" },
        { id: "error-accounts", label: "Error and suspense account usage" },
      ],
    },
    {
      id: "people",
      label: "People and licensing",
      help: "Who is authorised to do this work, and what drives their behaviour. Incentives are a conduct control.",
      colorSlot: 5,
      required: true,
      options: [
        { id: "appointed-reps", label: "Appointed representatives on the public register" },
        { id: "commission-driven", label: "Commission or volume-linked pay", hint: "Direct incentive to mis-sell" },
        { id: "high-headcount", label: "Large representative population" },
        { id: "new-joiners", label: "Significant hiring in the period" },
        { id: "cpd", label: "Continuing training and competency requirements" },
        { id: "senior-managers", label: "Senior managers in specified functions", hint: "Individual accountability" },
        { id: "outsourced-sales", label: "Sales staff employed by another entity" },
      ],
    },
    {
      id: "controls",
      label: "Known control weaknesses",
      help: "Where you already suspect the controls are thin. This is what makes the programme an audit rather than a walkthrough.",
      colorSlot: null,
      required: false,
      options: [
        { id: "complaints-up", label: "Rising or clustered customer complaints" },
        { id: "prior-findings", label: "Prior conduct findings still open" },
        { id: "mis-selling", label: "Mis-selling allegations or remediation under way" },
        { id: "surveillance-untuned", label: "Surveillance alerts not tuned or not cleared" },
        { id: "manual-suitability", label: "Suitability documented manually" },
        { id: "pa-dealing-gaps", label: "Personal account dealing not systematically monitored" },
        { id: "training-overdue", label: "Training or competency records incomplete" },
        { id: "register-mismatch", label: "Representative register not reconciled to HR records" },
        { id: "regulatory-attention", label: "Recent regulatory queries or inspection" },
      ],
    },
  ],

  themes: [
    { id: "fair-dealing", label: "Fair dealing outcomes", scope: "Board and senior management responsibility for delivering fair dealing to customers." },
    { id: "know-your-client", label: "Know your client", scope: "Obtaining and recording the customer information on which any recommendation must rest." },
    { id: "suitability", label: "Suitability and reasonable basis", scope: "Having a reasonable basis for a recommendation, and documenting why it suits this customer." },
    { id: "product-due-diligence", label: "Product due diligence and approval", scope: "Assessing a product before it is offered, and identifying the customers it is appropriate for." },
    { id: "customer-classification", label: "Customer classification", scope: "Determining and evidencing customer status, including opt-in and opt-out where offered." },
    { id: "disclosure", label: "Disclosure and documentation", scope: "What must be disclosed before and at the point of sale, and the records that evidence it." },
    { id: "advertising", label: "Advertising and marketing", scope: "Standards for promotional material, including balance, prominence of risk and approval before use." },
    { id: "best-execution", label: "Best execution and order handling", scope: "Executing customer orders on the best available terms, order priority, and allocation." },
    { id: "market-abuse", label: "Market abuse and surveillance", scope: "Insider dealing, market manipulation, and the monitoring expected of an intermediary." },
    { id: "conflicts", label: "Conflicts of interest", scope: "Identifying, mitigating and disclosing conflicts, including personal account dealing and research independence." },
    { id: "licensing", label: "Representative licensing", scope: "Appointment, notification and the fit and proper criteria applying to representatives." },
    { id: "competency", label: "Training and competency", scope: "Entry and examination requirements, and continuing professional development." },
    { id: "remuneration", label: "Remuneration and incentives", scope: "Balanced scorecards and incentive structures that do not reward poor customer outcomes." },
    { id: "complaints", label: "Complaints handling", scope: "Receiving, investigating, resolving and reporting customer complaints." },
    { id: "accountability", label: "Individual accountability", scope: "Specifying senior management responsibilities and holding named individuals accountable for them." },
  ],

  sourceDomains: MARKETS_CONDUCT_SOURCE_DOMAINS,

  riskBrief: [
    "You are a compliance and conduct specialist assessing a Singapore capital markets services",
    "licence holder on behalf of its Internal Audit function.",
    "",
    "You return the conduct risk factors this business model creates — the ways a customer could be",
    "sold something unsuitable, told something misleading, charged unfairly, disadvantaged in the",
    "market by the firm's own trading, or dealt with by someone not licensed or competent to do so.",
    "",
    "The sharpest factors come from combinations of segment, product, channel and incentive: a",
    "complex leveraged product sold to retail customers by commission-paid representatives is a",
    "conduct exposure that none of those four facts creates on its own.",
  ].join("\n"),

  obligationsBrief: [
    "The Securities and Futures Act and the Financial Advisers Act and their subsidiary regulations",
    "first, then the MAS notices and guidelines that sit under them — fair dealing, the sale of",
    "investment products, execution of customers' orders, representative notification and",
    "examination requirements, and individual accountability and conduct — then the exchange",
    "rulebook for trading conduct. Be careful to distinguish what binds an intermediary from what",
    "binds a financial adviser, since a firm may hold both licences and the obligations differ.",
  ].join("\n"),

  scopeBrief:
    "A control area here is usually one conduct obligation applied to one part of the business — for example 'Suitability documentation for leveraged products sold to retail customers', not 'Fair dealing'.",

  evidenceBrief: [
    "Evidence in this domain is the customer file and the system record behind it: the completed",
    "know-your-client and risk profile forms, the advice documentation showing the basis for a",
    "recommendation, call recordings, the approved marketing material with its sign-off, the",
    "product approval paper, order and execution timestamps from the order management system,",
    "surveillance alerts with their disposition, the personal account dealing register and",
    "pre-clearance records, the public representative register reconciled to HR records, training",
    "completion data, and the complaints log with outcomes and root cause.",
  ].join("\n"),
});
