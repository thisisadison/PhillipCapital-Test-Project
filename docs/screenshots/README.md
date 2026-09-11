# Audit programme — a technology audit, end to end

A walkthrough of the audit programme designer, following one use case: scoping a
**technology audit** of a Singapore capital markets firm whose order management
platform moved to the cloud in Q2, leaving the vendor in control of patching.

> **These are illustrative.** The programme content was written by hand so the
> app has something to show without an API key attached. The *shape* is real —
> every screen below is the actual UI rendering a document that passed the same
> schema a live run produces — but no model run produced this text. Say so if
> asked; the citations in particular should be checked against the current
> instruments before anyone relies on them.

---

## 1 · Choose what you are auditing

![Audit type picker](01-choose-audit-type.png)

Five audit types. The choice decides every question that follows — an AML audit
and a technology audit share a pipeline, not a questionnaire.

## 2 · Answer that audit's risk dimensions

![Technology intake](02-technology-intake.png)

The dimensions follow the MAS Technology Risk Management Guidelines and the MAS
Notice on Cyber Hygiene, mapped onto the four ITGC pillars external audit already
tests. Five required dimensions carry a colour; known control weaknesses is
optional and deliberately colourless — it is the firm's own view of its control
state, not an inherent risk dimension.

![Intake answered](03-intake-answered.png)

Twenty-three selections. Answering these **is** the risk assessment.

## 3 · What the agents produced

![Full planned programme](04-planned-full.png)

The whole page, in the order the work happened.

### The pipeline, visible

![Agent timeline](05-agent-timeline.png)

Each agent with what it produced, what it cost, how long it took, and **what it
rejected**. The Obligations Agent reports that it reached 6 of 14 themes — the
misses are stated, not hidden. The Evidence Agent is shown waiting, not failed.

### Your answers, read back

![Risk assessment](06-risk-assessment.png)

### Assessed risk

![Assessed risk](07-assessed-risk.png)

Every factor carries the colour of the dimension it arises from, and names the
selections that produced it. The strongest ones come from a *combination* —
vendor-controlled patching plus a hosted platform plus an existing backlog.

### Coverage, including the gaps

![Obligation coverage](08-obligation-coverage.png)

Eight themes not reached, shown as prominently as the six that were. A tool that
displayed only its hits would let silence read as "nothing there".

### Obligations, each with a source

![Obligations](09-obligations.png)

## 4 · The approval gate

![Proposed scope](10-scope-approval.png)

Six proposed control areas, each tied to the risks it answers and the obligations
it tests. An area that could not cite **both** was dropped before you saw it.

![Two areas dropped](11-scope-two-dropped.png)

Untick two and the estimate moves. Nothing is drafted for an area you declined —
this is a hard stop in the code, not a confirmation dialog.

## 5 · The finished programme

![Full completed programme](12-complete-full.png)

![Testing programme](13-testing-programme.png)

Testing steps for the four approved areas only. Every step names the evidence to
obtain and how the population is sampled — a step with no named evidence is
dropped rather than shown. The two declined areas stay on the document under
**Proposed and declined**, because what was considered and rejected is part of
the audit trail.

## Dark mode

![Dark](14-planned-dark.png)
