import { registerAuditDomain } from "../auditDomain";
import { PEOPLE_SOURCE_DOMAINS } from "@/server/service/research/sourceCatalogue";

/**
 * People and HR.
 *
 * A people audit at a licensed firm straddles two regimes, and the whole
 * difficulty is keeping them apart. MAS decides who may be appointed a
 * representative, what they must have passed, what the firm must check before
 * hiring them and what it must disclose when they leave. MOM, CPF and TAFEP
 * decide the employment relationship itself. A finding under one is not a
 * finding under the other, and the consequences differ sharply.
 *
 * The dimensions follow a person through the firm — who they are, how they got
 * in, what authorises them to do the work, what they are paid for, and what
 * happens when they leave. Exit is a dimension in its own right because it is
 * where two of the sharpest failures live: access that outlives employment, and
 * a reference that omits misconduct the next firm is entitled to know about.
 *
 * Where this abuts the conduct audit — licensing, competency, incentives — the
 * split is deliberate. Conduct asks whether the customer was well served.
 * This asks whether the firm's own people processes actually work. The scope
 * brief tells the agent to stay on its side of that line.
 */
export const PEOPLE_DOMAIN = registerAuditDomain({
  id: "people",
  label: "People & HR",
  blurb: "Fit and proper, hiring, licensing, reward and exit — the processes behind everyone the firm lets act for it.",
  frameworkNote:
    "The dimensions span both regimes that govern staff at a licensed firm: the MAS fit and proper criteria, representative notification and individual accountability expectations, and the employment obligations set by MOM, CPF and the fair employment guidelines.",
  titlePrefix: "People audit",
  titleDimension: "workforce",

  dimensions: [
    {
      id: "workforce",
      label: "Workforce composition",
      help: "Who acts for the firm, and in what capacity. Capacity decides which obligations attach to them at all.",
      colorSlot: 1,
      required: true,
      options: [
        { id: "appointed-reps", label: "Appointed representatives" },
        { id: "remisiers", label: "Remisiers and self-employed agents", hint: "Act for the firm without being employed by it" },
        { id: "support-staff", label: "Non-licensed operations and support staff" },
        { id: "senior-managers", label: "Senior managers in specified functions", hint: "Individual accountability applies" },
        { id: "contractors", label: "Contractors and agency staff" },
        { id: "overseas-staff", label: "Staff employed by overseas group entities" },
        { id: "outsourced-staff", label: "Outsourced staff acting for the firm" },
        { id: "work-pass-holders", label: "Foreign employees on work passes" },
      ],
    },
    {
      id: "hiring",
      label: "Hiring and screening",
      help: "How people get in. The checks here are what stand between the firm and someone it should not have appointed.",
      colorSlot: 2,
      required: true,
      options: [
        { id: "fit-and-proper", label: "Fit and proper assessment" },
        { id: "reference-checks", label: "Reference checks with previous financial institutions", hint: "Mandatory for representatives" },
        { id: "background-screening", label: "Background and criminal record screening" },
        { id: "bankruptcy-checks", label: "Bankruptcy and financial standing checks" },
        { id: "qualification-verification", label: "Verification of qualifications and examinations" },
        { id: "agency-hiring", label: "Hiring through recruitment agencies" },
        { id: "high-volume", label: "High-volume or seasonal hiring" },
        { id: "rehires", label: "Rehires and internal transfers", hint: "Screening often skipped" },
      ],
    },
    {
      id: "licensing",
      label: "Authorisation and competency",
      help: "What authorises someone to do the work they do, and what keeps it current.",
      colorSlot: 3,
      required: true,
      options: [
        { id: "notification", label: "Appointment and notification to the regulator" },
        { id: "entry-exams", label: "Entry and examination requirements" },
        { id: "cpd", label: "Continuing professional development" },
        { id: "role-changes", label: "Role changes requiring requalification" },
        { id: "supervisors", label: "Supervisory competency requirements" },
        { id: "product-training", label: "Training before selling a new product" },
        { id: "manual-tracking", label: "Records kept in a manual tracker", hint: "Reconciliation to the public register" },
        { id: "annual-attestation", label: "Annual fit and proper reattestation" },
      ],
    },
    {
      id: "reward",
      label: "Reward and performance",
      help: "What people are paid for. Incentives are a control — or, badly designed, the reason a control fails.",
      colorSlot: 4,
      required: true,
      options: [
        { id: "commission", label: "Commission or volume-linked pay" },
        { id: "balanced-scorecard", label: "Balanced scorecard for representatives" },
        { id: "sales-targets", label: "Sales targets and league tables" },
        { id: "discretionary-bonus", label: "Discretionary bonus pool" },
        { id: "deferral-clawback", label: "Deferral or clawback arrangements" },
        { id: "performance-ratings", label: "Performance ratings feeding pay decisions" },
        { id: "conduct-adjustment", label: "Conduct outcomes adjusting pay" },
        { id: "payroll-outsourced", label: "Payroll outsourced to a vendor" },
      ],
    },
    {
      id: "exit",
      label: "Movement and exit",
      help: "What happens when someone changes role or leaves. Where access outlives employment, and where misconduct gets buried.",
      colorSlot: 5,
      required: true,
      options: [
        { id: "resignations", label: "Resignations and retirements" },
        { id: "dismissals", label: "Dismissals for misconduct" },
        { id: "access-revocation", label: "System access revoked on exit", hint: "Ties to the technology audit" },
        { id: "references-given", label: "References given to other institutions", hint: "Misconduct must be disclosed" },
        { id: "internal-transfers", label: "Transfers between entities or roles" },
        { id: "garden-leave", label: "Notice periods and garden leave" },
        { id: "record-retention", label: "Retention of personnel records" },
        { id: "exit-interviews", label: "Exit interviews and themes arising" },
      ],
    },
    {
      id: "controls",
      label: "Known control weaknesses",
      help: "Where you already suspect the controls are thin. This is what makes the programme an audit rather than a walkthrough.",
      colorSlot: null,
      required: false,
      options: [
        { id: "prior-findings", label: "Prior people or HR findings still open" },
        { id: "register-mismatch", label: "Representative register not reconciled to HR records" },
        { id: "training-incomplete", label: "Training or CPD records incomplete" },
        { id: "reattestation-overdue", label: "Fit and proper reattestation overdue" },
        { id: "access-lag", label: "Access not revoked promptly on exit" },
        { id: "misconduct-offline", label: "Misconduct cases handled outside the formal process" },
        { id: "high-turnover", label: "High turnover in licensed roles" },
        { id: "hr-system-change", label: "HR or payroll system changed recently" },
        { id: "manual-records", label: "Personnel records kept manually" },
        { id: "whistleblowing-untested", label: "Whistleblowing channel never tested" },
      ],
    },
  ],

  themes: [
    { id: "fit-and-proper", label: "Fit and proper assessment", scope: "The criteria a person must meet to be appointed, and the evidence the firm must hold that they do." },
    { id: "screening", label: "Pre-employment screening", scope: "Background, criminal, bankruptcy and qualification checks before someone is engaged." },
    { id: "reference-checks", label: "Reference checks", scope: "Obtaining references from a candidate's previous financial institution employers before appointment." },
    { id: "appointment", label: "Appointment and notification", scope: "Notifying the regulator of an appointment, cessation or change, and keeping the public register accurate." },
    { id: "examinations", label: "Entry and examination requirements", scope: "The examinations a person must pass for the activities they will conduct, and exemptions from them." },
    { id: "cpd", label: "Continuing professional development", scope: "Ongoing training hours, their content, and the records evidencing completion." },
    { id: "supervision", label: "Supervision and delegation", scope: "Supervisory arrangements over representatives, and the competency required to supervise." },
    { id: "accountability-mapping", label: "Accountability mapping", scope: "Identifying senior managers, specifying their responsibilities in writing, and keeping the map current." },
    { id: "remuneration-governance", label: "Remuneration governance", scope: "How pay structures are designed, approved and reviewed, including deferral and adjustment for conduct." },
    { id: "outside-interests", label: "Outside business interests", scope: "Declaring and approving external appointments, directorships and other activities." },
    { id: "misconduct", label: "Misconduct and discipline", scope: "Investigating, recording and acting on staff misconduct, and reporting it where required." },
    { id: "exit-disclosure", label: "Disclosure on departure", scope: "What must be told to the regulator and to a prospective employer when someone leaves." },
    { id: "employment-terms", label: "Employment terms and statutory obligations", scope: "Contracts, key employment terms, working hours, leave and statutory contributions." },
    { id: "foreign-manpower", label: "Foreign manpower", scope: "Work pass eligibility and conditions, and fair consideration in hiring." },
    { id: "offboarding", label: "Offboarding", scope: "Removing access and authority, recovering assets, and retaining records after departure." },
    { id: "whistleblowing", label: "Whistleblowing and speak-up", scope: "Channels for raising concerns, protection from retaliation, and how reports are handled." },
    { id: "employee-data", label: "Employee personal data", scope: "Collection, use, retention and protection of staff personal data." },
  ],

  sourceDomains: PEOPLE_SOURCE_DOMAINS,

  riskBrief: [
    "You are a people and governance risk specialist assessing a Singapore capital markets services",
    "licence holder on behalf of its Internal Audit function.",
    "",
    "You return the risk factors this workforce and these people processes create — the ways",
    "someone could end up acting for the firm without being fit, licensed or competent to; be paid",
    "in a way that rewards the wrong behaviour; keep access or authority after they should have lost",
    "it; or leave with misconduct undisclosed to the firm that hires them next.",
    "",
    "Be precise about capacity. A remisier who is not an employee, an outsourced processor and an",
    "appointed representative attract different obligations, and a factor that ignores which one it",
    "is describing is not usable.",
  ].join("\n"),

  obligationsBrief: [
    "Two regimes apply and you must keep them apart. MAS sets the fit and proper criteria,",
    "representative notification and examination requirements, and the individual accountability and",
    "conduct expectations — reach for those first, since they are what makes this a regulated firm's",
    "people audit rather than any employer's. Then MOM, CPF and the fair employment guidelines for",
    "the employment relationship itself, and the data protection regime for staff personal data.",
    "Label each obligation with which regime it comes from: a MOM breach and a MAS breach are not",
    "the same finding and do not go to the same people.",
  ].join("\n"),

  scopeBrief: [
    "A control area here is one people process end to end — for example 'Reference checks and fit",
    "and proper assessment for newly appointed representatives', not 'HR'.",
    "",
    "Stay on the people-process side of the line. Whether a representative's advice suited the",
    "customer belongs to a conduct audit; whether that representative was screened, licensed and",
    "supervised belongs here. If an area would sit better in a conduct audit, leave it out and say",
    "so rather than duplicating testing the other audit will do properly.",
  ].join("\n"),

  evidenceBrief: [
    "Evidence here is the personnel file and the systems that should agree with it: screening",
    "reports and their dates, reference request and response correspondence, examination",
    "certificates, CPD completion data, the signed responsibility map for senior managers,",
    "declarations of outside interests, disciplinary case files, payroll reports, and exit",
    "checklists with the access-revocation timestamps from the systems themselves.",
    "",
    "The single most productive test in this domain is a reconciliation: the regulator's public",
    "register of the firm's representatives against its own HR records, both obtained independently.",
    "Differences in either direction are findings — someone appointed who has left, or someone",
    "advising who was never notified.",
    "",
    "Employee records are personal data. Test with identifiers redacted or with a sample the firm",
    "pseudonymises; an audit that copies staff files into a working paper creates its own breach.",
  ].join("\n"),
});
