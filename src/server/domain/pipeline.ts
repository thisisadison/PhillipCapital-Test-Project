import type { AgentRun } from "./programme";

/**
 * The four agents, defined once.
 *
 * Two places render this: the overview on the programme index, which explains
 * what will happen, and the timeline on a finished programme, which shows what
 * did. They were separate lists until they started saying different things
 * about the same agent, so now there is one definition and two renderings.
 */

export interface PipelineStage {
  id: AgentRun["agent"];
  name: string;
  /** What this agent is for. One line, in the auditor's own terms. */
  objective: string;
  /** Why it is built this way. Shown on the overview only. */
  note: string;
  /** Runs alongside the stage before it rather than after it. */
  parallel?: boolean;
  /** Runs only once the auditor has approved the scope. */
  afterApproval?: boolean;
}

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  {
    id: "risk",
    name: "Risk Agent",
    objective: "Works out what this firm is exposed to.",
    note: "Has no search. Its job is judgement about the firm in front of it, not research.",
  },
  {
    id: "obligations",
    name: "Obligations Agent",
    objective: "Finds the requirements the audit will test against.",
    note: "The only agent that searches. Every obligation cites a page it actually opened.",
    parallel: true,
  },
  {
    id: "scope",
    name: "Scope Agent",
    objective: "Turns those two into proposed control areas.",
    note: "An area it cannot tie to both a risk and an obligation is dropped, not shown.",
  },
  {
    id: "evidence",
    name: "Evidence Agent",
    objective: "Writes the testing steps.",
    note: "Runs last and only over what you kept, so the expensive stage is aimed by you.",
    afterApproval: true,
  },
] as const;

/** The human decision, which sits between the Scope and Evidence agents. */
export const APPROVAL_GATE = {
  name: "You approve the scope",
  objective: "Keep or drop each proposed area.",
  note: "Nothing further is drafted until you decide. This is the point of the whole design.",
} as const;
