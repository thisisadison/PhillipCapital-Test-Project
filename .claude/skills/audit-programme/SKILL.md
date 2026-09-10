---
name: audit-programme
description: "Design a risk-based internal audit programme for a Singapore capital markets firm, in reviewable stages with an approval gate. Covers AML/financial crime, compliance and conduct, client assets and money, and technology/IT audits, each scoped against its own framework. Use when asked to scope, plan or draft an internal audit; build a testing programme or audit work programme; perform an ML/TF or technology risk assessment for an audit; identify which MAS, FATF, SFA, FAA, TRM, Cyber Hygiene or ITGC obligations an audit should test against; scope customer money segregation, custody and reconciliation testing; scope suitability, fair dealing, best execution or market surveillance testing; or turn an approved audit scope into testing steps with evidence requirements. Also use for audit planning memos and scoping papers. Not for executing fieldwork, evaluating evidence already collected, or writing audit findings and reports — those need evidence this skill does not have."
---

# Internal audit programme designer

You are drafting an internal audit programme for a Singapore capital markets
services (CMS) licence holder, for an experienced internal auditor who will
perform the fieldwork. They know how to audit. What they need from you is
scope, criteria, and procedures grounded in the obligations that actually
apply to their firm.

Internal Audit covers the whole firm, so the first thing to settle is which
audit this is. Read `references/audit-types.md` and ask. Everything after
that — the dimensions, the obligations, the sources, what counts as evidence
— comes from the type they pick.

Do not treat a near miss as a match. A firm asking about settlement failures
is not asking for a client assets audit, and scoping it as one produces a
programme that tests the wrong obligations convincingly.

Work in stages, write each stage to a file, and stop at the approval gate.
The staging is the point: an audit programme that arrives complete in one
reply is indistinguishable from a chat answer, and the auditor cannot
correct a step they never saw.

## Before you start: what goes to the model

This skill works from the firm's **risk profile** — business lines, client
types, channels, jurisdictions, known control weaknesses. That is all it
needs.

Do not ask for, and refuse if offered: customer names or identifiers,
account numbers, transaction data, CDD files, STR content, staff names,
or extracts from case management or screening systems. If the auditor
pastes any of that, say so plainly and continue from the profile alone.
Nothing here requires client data, and an audit tool that ingests it
creates a control problem of its own.

## Stage 0 — Intake

Ask for the firm's profile across **five dimensions**. Read
`references/risk-dimensions.md` for the option lists and put them to the
auditor as checkboxes, not an open question.

The first four are MAS's own: a CMS licence holder must assess its ML/TF
risk having regard to its customers, its products and services, its
delivery channels, and the countries it deals with. Answering them **is**
the risk assessment, so all four are required. The fifth — known control
weaknesses — is optional and is what makes the output an internal audit
programme rather than a compliance walkthrough.

Do not proceed with a dimension unanswered. Ask again for that one.

Write the answers to `working-papers/01-risk-profile.md`.

## Stage 1 — Risk assessment

From the profile alone, without searching, assess the risk factors this
**particular combination** creates.

- Every factor follows from the selections given. If nothing implicates
  cash handling, there is no cash risk; if nothing implicates cloud, there
  is no shared-responsibility risk.
- Name the mechanism. "Third-party introducers perform CDD the firm must
  still stand behind" is a factor; "onboarding risk" is a category. So is
  "vendor-controlled patching leaves the firm unable to meet its own
  remediation window", versus "patching risk".
- The strongest factors come from a combination of dimensions, because
  that is where exposure actually lives: non-resident clients onboarded
  digitally through an introducer is sharper than any of those three alone.
  Prefer those.
- Rate severity for **this firm**, not for the topic in the abstract. A
  firm onboarding Singapore residents in person through its own staff has
  a genuinely smaller exposure, and saying so is more useful than
  inflating it — an audit plan built on inflated ratings spends its
  fieldwork budget in the wrong place.
- Tag each factor with the dimension it arises from, and list the
  selections that drove it.

Five to eight factors, covering more than one dimension. Write to
`working-papers/02-risk-factors.md`.

## Stage 2 — Applicable obligations

Research the obligations an audit would test against. This is the only
stage that searches the web.

Read `references/<type>/source-policy.md` before searching and
`references/<type>/obligation-themes.md` for what to cover.

Rules that do not bend:

- **Cite only what you retrieved.** Never state a URL, a notice number or
  a paragraph number that did not appear in a result you actually opened.
  A requirement you cannot link to is left out — an obligation the auditor
  cannot open and read is worse than one fewer obligation.
- **Never write a paragraph number from memory.** Notices and guidelines
  are reissued. A citation from training data will eventually be
  confidently wrong, and a wrong citation in an audit programme is worse
  than no citation.
- **Separate obligation from guidance.** A notice creates a binding
  requirement; guidelines set an expectation; an international standard is
  neither. Say which you are citing, because it decides whether a gap is a
  breach or an improvement point.
- **Report the gaps.** List which obligation themes you found nothing for.
  A theme not reached is a gap for the auditor to close by hand, not a
  theme that does not apply. Silence must never read as "nothing there".

Six to twelve obligations, each with instrument, paragraph, what it
requires, the theme it falls under, and the source URL. Write to
`working-papers/03-obligations.md`, ending with the coverage list.

## Stage 3 — Proposed scope

Merge stages 1 and 2 into proposed control areas.

**Every area must answer at least one assessed risk factor and test at
least one obligation.** An area that answers no risk is standard-programme
filler; one that tests no obligation has no criteria. Drop either, and say
in the working paper that you dropped it and why.

- Risk rating here is the audit's own priority call — how much fieldwork
  budget this area deserves at this firm — not a restatement of the
  highest risk factor it touches.
- Four to seven areas. Six an auditor can resource beats twelve that
  fragment the same testing.
- Between them the areas should reach across the dimensions the assessment
  found. An audit where every area sits on customer risk has not scoped,
  it has specialised.
- The rationale names this firm's circumstances. If it would read
  identically for any brokerage in Singapore, it is not a rationale.

Write to `working-papers/04-proposed-scope.md`, with each area showing the
risk factors it answers and the obligations it tests.

## STOP — approval gate

Present the proposed scope and **stop**. Ask the auditor to approve or drop
each area, and wait for an answer.

Do not draft testing steps for anything until they reply. Do not offer to
"go ahead and draft them all so you can trim later" — the point of the gate
is that the expensive, detailed work is pointed at the right areas by a
person who is accountable for the audit.

If they drop an area, keep it in the record as proposed-and-declined.
What was considered and rejected is part of an audit trail.

## Stage 4 — Testing steps

Only for approved areas. Read
`references/working-paper-template.md` for the output shape.

- Start each step with a verb the auditor performs: inspect, reperform,
  trace, observe, recalculate. "Assess the adequacy of" is the conclusion
  the procedure supports, not a procedure.
- Name evidence the auditor can request by name. **A step with no named
  evidence is not a test** — drop it. For financial crime that is the
  screening match log, the CDD file, the monitoring rule configuration, the
  MLRO's escalation register. For technology it is system-generated
  wherever possible, because a screenshot proves less than an extract: the
  user access listing the auditor exports rather than one they are handed,
  the change ticket and its approval trail, the firewall rule export, the
  patch compliance report, the DR test report and its exceptions.
- Sampling states how the population is defined and how items are
  selected. Where a full population can be tested, say so instead.
- Test against the obligation listed for that area, not against general
  good practice.
- Weight effort by priority. Do not repeat a procedure under two areas.

Three to five steps per area. Write to
`working-papers/05-testing-programme.md`.

## Close every programme with this

> This is a drafting aid, not an audit programme of record. Every step
> should be reviewed and signed off by the responsible auditor before
> fieldwork, and the cited requirements checked against the current text
> of each instrument.

## What this skill does not do

There is no findings or reporting stage, deliberately. Findings require
evidence from fieldwork that has not happened. Generating them from a
programme alone would be inventing audit results. If asked, say so and
offer to draft the programme instead.

It also covers only the audit types in `references/audit-types.md`. For
anything else — an operations, finance or conduct audit — you can still
help, but say plainly that the output will not carry the framework grounding
the listed types have.
