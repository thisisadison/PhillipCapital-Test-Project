import { registerAuditDomain } from "../auditDomain";
import { TECHNOLOGY_SOURCE_DOMAINS } from "@/server/service/research/sourceCatalogue";

/**
 * Technology / IT.
 *
 * The dimensions are anchored the same way the AML ones are — to frameworks an
 * auditor and a supervisor both already recognise — rather than invented here.
 * Three sources sit behind them:
 *
 *  - **MAS Technology Risk Management Guidelines**, which set the supervisory
 *    expectations for a Singapore financial institution: governance, project
 *    and change management, systems resilience, access control, cyber security
 *    operations, and third-party dependency.
 *  - **The MAS Notice on Cyber Hygiene**, which is where several of these stop
 *    being guidance and become mandatory baseline measures — administrative
 *    accounts, patching, network perimeter, malware protection, multi-factor
 *    authentication.
 *  - **ITGC**, the profession's own four pillars: access to programs and data,
 *    program changes, program development, and computer operations. Every
 *    external auditor tests these, so an internal programme that ignores them
 *    is inviting duplicated work.
 *
 * The five risk dimensions carry a colour; known weaknesses does not, for the
 * reason given on `ColorSlot`.
 */
export const TECHNOLOGY_DOMAIN = registerAuditDomain({
  id: "technology",
  label: "Technology / IT",
  blurb: "System, data and cyber controls, against the MAS Technology Risk Management Guidelines and ITGC.",
  frameworkNote:
    "The dimensions follow the MAS Technology Risk Management Guidelines and the MAS Notice on Cyber Hygiene, mapped onto the four ITGC pillars external audit already tests.",
  titlePrefix: "Technology audit",
  titleDimension: "environment",

  dimensions: [
    {
      id: "environment",
      label: "Technology environment",
      help: "What the business actually runs on. Determines which systems are in scope at all.",
      colorSlot: 1,
      required: true,
      options: [
        { id: "core-trading", label: "Core trading and order management systems" },
        { id: "customer-apps", label: "Customer-facing applications and portals" },
        { id: "cloud", label: "Cloud infrastructure", hint: "Shared responsibility model applies" },
        { id: "on-premise", label: "On-premise infrastructure and data centres" },
        { id: "vendor-systems", label: "Third-party and vendor-hosted systems", hint: "MAS outsourcing obligations" },
        { id: "data-platforms", label: "Data platforms, warehouses and databases" },
        { id: "integrations", label: "APIs and system integrations" },
        { id: "ai-ml", label: "AI or machine learning systems", hint: "Model governance and explainability" },
        { id: "end-user-computing", label: "Spreadsheets and end-user computing", hint: "Often unmanaged, often material" },
      ],
    },
    {
      id: "criticality",
      label: "Criticality and resilience",
      help: "What breaks if these systems stop. Drives the recovery and continuity obligations.",
      colorSlot: 2,
      required: true,
      options: [
        { id: "business-critical", label: "Business-critical systems", hint: "MAS caps unscheduled downtime" },
        { id: "financial-transactions", label: "Systems executing financial transactions" },
        { id: "customer-data", label: "Systems holding customer data" },
        { id: "regulatory-reporting", label: "Systems supporting regulatory reporting" },
        { id: "market-connectivity", label: "Exchange and market connectivity" },
        { id: "single-points", label: "Known single points of failure" },
        { id: "concentration", label: "Concentration on one vendor or region", hint: "Cloud or data-centre concentration" },
        { id: "non-critical", label: "Non-critical internal applications" },
      ],
    },
    {
      id: "data",
      label: "Data risk",
      help: "What information the technology handles. Drives PDPA and MAS data protection expectations.",
      colorSlot: 3,
      required: true,
      options: [
        { id: "personal-data", label: "Customer personal data", hint: "PDPA obligations" },
        { id: "financial-data", label: "Financial and transaction data" },
        { id: "confidential-business", label: "Confidential business information" },
        { id: "regulatory-data", label: "Regulatory and compliance records" },
        { id: "high-volume", label: "Large volumes of sensitive data" },
        { id: "cross-border-data", label: "Data held or processed overseas", hint: "Cross-border transfer conditions" },
        { id: "non-production-copies", label: "Production data copied to test environments" },
      ],
    },
    {
      id: "access",
      label: "Access and security risk",
      help: "Who can reach these systems and what they can do. The first ITGC pillar, and where most findings land.",
      colorSlot: 4,
      required: true,
      options: [
        { id: "privileged", label: "Privileged and administrator access", hint: "Mandatory measure under Cyber Hygiene" },
        { id: "many-users", label: "Large user population" },
        { id: "remote-access", label: "Remote and mobile access" },
        { id: "third-party-access", label: "Third-party or vendor access" },
        { id: "shared-accounts", label: "Shared or generic accounts", hint: "Breaks individual accountability" },
        { id: "manual-provisioning", label: "Manual access provisioning and removal" },
        { id: "no-mfa", label: "Systems without multi-factor authentication" },
        { id: "recent-access-change", label: "Recent reorganisation or access model change" },
      ],
    },
    {
      id: "change",
      label: "Technology change risk",
      help: "How the estate changes. The second and third ITGC pillars — program changes and development.",
      colorSlot: 5,
      required: true,
      options: [
        { id: "major-implementation", label: "Major system implementation in the period" },
        { id: "frequent-releases", label: "Frequent production changes or continuous deployment" },
        { id: "legacy", label: "Legacy systems", hint: "Often unsupported and unpatched" },
        { id: "migration", label: "Recent migration", hint: "Cloud move, data centre move, platform change" },
        { id: "upgrades", label: "Major software or infrastructure upgrades" },
        { id: "custom-development", label: "Significant in-house development" },
        { id: "emergency-changes", label: "Regular emergency or out-of-process changes" },
        { id: "vendor-patching", label: "Patching controlled by a vendor" },
      ],
    },
    {
      id: "controls",
      label: "Known control weaknesses",
      help: "Where you already suspect the controls are thin. This is what makes the programme an audit rather than a walkthrough.",
      colorSlot: null,
      required: false,
      options: [
        { id: "open-findings", label: "Previous IT audit findings still open" },
        { id: "incidents", label: "Security incidents or breaches in the period" },
        { id: "patch-backlog", label: "Patch management backlog" },
        { id: "access-reviews-overdue", label: "User access reviews overdue" },
        { id: "dr-untested", label: "Disaster recovery not tested, or tests failed" },
        { id: "poor-documentation", label: "Incomplete system documentation" },
        { id: "vendor-management", label: "Vendor management or oversight concerns" },
        { id: "pentest-findings", label: "Penetration test findings unremediated" },
        { id: "logging-gaps", label: "Audit logging incomplete or not reviewed" },
        { id: "it-turnover", label: "High turnover in IT or security" },
      ],
    },
  ],

  themes: [
    { id: "governance", label: "Technology risk governance", scope: "Board and senior management oversight of technology risk, the risk management framework, and the IT audit requirement itself." },
    { id: "logical-access", label: "Logical access management", scope: "Granting, reviewing and removing user access; segregation of duties; periodic recertification." },
    { id: "privileged-access", label: "Privileged access management", scope: "Administrative and system accounts, their approval, monitoring and the controls mandated over them." },
    { id: "authentication", label: "Authentication controls", scope: "Password standards and multi-factor authentication, particularly for remote and administrative access." },
    { id: "change-management", label: "Change management", scope: "Authorisation, testing and approval of production changes, including emergency changes." },
    { id: "sdlc", label: "Project and system development", scope: "Project governance, requirements, testing and go-live approval for new or materially changed systems." },
    { id: "computer-operations", label: "Computer operations", scope: "Job scheduling, backup and restoration, and the monitoring of both." },
    { id: "resilience", label: "Availability and recoverability", scope: "Recovery objectives, disaster recovery testing, business continuity, and limits on unscheduled downtime." },
    { id: "cyber-operations", label: "Cyber security operations", scope: "Threat monitoring, detection and response, and the baseline measures a financial institution must maintain." },
    { id: "vulnerability", label: "Patching and vulnerability management", scope: "Identifying, prioritising and applying security patches, and remediating findings from testing." },
    { id: "network-security", label: "Network and perimeter security", scope: "Network segmentation, perimeter defence, and malware protection." },
    { id: "data-protection", label: "Data governance and protection", scope: "Classification, encryption, loss prevention, retention, and conditions on holding or transferring data overseas." },
    { id: "third-party", label: "Third-party and outsourcing risk", scope: "Due diligence, contractual rights, ongoing oversight and audit access over material service providers." },
    { id: "incident-management", label: "Incident management and reporting", scope: "Detection, escalation, root cause analysis, and notification obligations to the regulator and to customers." },
  ],

  sourceDomains: TECHNOLOGY_SOURCE_DOMAINS,

  riskBrief: [
    "You are a technology risk specialist assessing the IT control environment of a Singapore",
    "capital markets services licence holder, on behalf of its Internal Audit function.",
    "",
    "You return the technology risk factors that this particular estate creates — the ways these",
    "systems, this data, this access model and this rate of change could result in unauthorised",
    "access, unavailable service, corrupted or leaked data, or an unauthorised change reaching",
    "production.",
  ].join("\n"),

  obligationsBrief: [
    "The MAS Technology Risk Management Guidelines and the MAS Notice on Cyber Hygiene first — the",
    "Notice is where several measures become mandatory rather than expected, so be precise about",
    "which is which. Then the MAS Outsourcing Guidelines where third parties are in scope, the PDPA",
    "where personal data is, and NIST, ISO 27001 or COBIT where they add a control expectation the",
    "MAS material does not spell out. Ignore obligations for systems this firm does not run.",
  ].join("\n"),

  scopeBrief:
    "A control area here is usually an ITGC domain narrowed to this estate — for example 'Privileged access to the core trading platform', not 'Cyber security'. Name the systems.",

  evidenceBrief: [
    "Evidence in this domain is system-generated wherever possible, because a screenshot proves",
    "less than an extract: the user access listing exported by the auditor rather than supplied,",
    "the change ticket with its approval trail, CAB minutes, the firewall rule export, the patch",
    "compliance report, the DR test report and its exceptions, the privileged account inventory,",
    "and audit logs showing the control operating rather than a policy saying it should.",
  ].join("\n"),
});
