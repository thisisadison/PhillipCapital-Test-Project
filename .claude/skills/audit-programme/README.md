# Running this in Claude Cowork

This folder is an Agent Skill. It is the same skill in two places: Claude
Code picks it up from `.claude/skills/` in this repo, and Cowork picks it up
when the folder is added to a workspace. There is no build step and nothing
to deploy — a skill is a folder of markdown.

## Setup

1. Open Cowork and create a workspace for the audit (one per audit, so the
   working papers stay together).
2. Add this folder as a skill. Verify it loaded by asking *"what skills do
   you have?"*.
3. Turn on web search for the workspace. Stage 2 cannot cite anything
   without it, and the skill will tell you so rather than working from
   memory.

## Using it

Say what you want in your own words:

> Design an AML audit programme for our retail and institutional brokerage.

or

> Scope a technology audit of our trading platform and cloud estate.

Claude loads the skill and works the stages:

| Stage | Output | Who decides |
|---|---|---|
| 0 Audit type + intake | `01-risk-profile.md` | You pick the type, then answer its dimensions |
| 1 Risk assessment | `02-risk-factors.md` | Claude, from the profile alone |
| 2 Obligations | `03-obligations.md` | Claude, with web search |
| 3 Proposed scope | `04-proposed-scope.md` | Claude proposes |
| **Approval gate** | — | **You approve or drop each area** |
| 4 Testing steps | `05-testing-programme.md` | Claude, approved areas only |

It stops at the gate. That is the design, not a limitation: the detailed
work is pointed at the right areas by the person accountable for the audit.

Ask for the finished programme as a Word document or a spreadsheet and you
will get one — a programme that has to be retyped into the audit file is a
programme that will be retyped badly.

## What not to put in

The skill works from the firm's **risk profile** — business lines, client
types, channels, jurisdictions, known weaknesses. It never needs customer
names, account numbers, transaction data, CDD files or STR content, and it
is written to refuse them.

## Re-running it

A workspace per audit keeps each set of working papers separate. To rescope
an audit in progress, run it again in the same workspace and the earlier
papers stay as a record of what changed.

## Which audits it covers

AML / financial crime, and technology / IT. Each is scoped against its own
framework — MAS's four ML/TF risk dimensions for the first, the MAS
Technology Risk Management Guidelines and the ITGC pillars for the second —
so the questions, the obligations and the sources all change with the type.

For an audit type it does not cover, it will still help, but it says so
rather than implying the same grounding.

## Keeping the references current

`references/` is generated from this repository's domain modules
(`src/server/domain/`). Edit those and run `npm run skill:refs`; a test
fails if the two drift, so the skill and the web app cannot end up
describing different risk dimensions to two different auditors.
