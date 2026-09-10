import { describe, expect, it } from "vitest";
import { APPROVAL_GATE, PIPELINE_STAGES } from "./pipeline";
import { agentRunSchema } from "./programme";

describe("the pipeline definition", () => {
  it("covers exactly the agents a run can record, in order", () => {
    // The overview and the timeline both render this list. If it drifts from
    // the schema, one of them silently stops showing an agent that ran.
    const recordable = agentRunSchema.shape.agent.options;

    expect(PIPELINE_STAGES.map((stage) => stage.id)).toEqual([...recordable]);
  });

  it("has exactly one parallel stage, and it is not the first", () => {
    const parallel = PIPELINE_STAGES.filter((stage) => stage.parallel);

    expect(parallel).toHaveLength(1);
    expect(PIPELINE_STAGES[0]?.parallel).toBeUndefined();
  });

  it("has exactly one stage behind the approval gate, and it is last", () => {
    const gated = PIPELINE_STAGES.filter((stage) => stage.afterApproval);

    expect(gated).toHaveLength(1);
    expect(gated[0]?.id).toBe(PIPELINE_STAGES.at(-1)?.id);
  });

  it("gives every stage an objective and a note", () => {
    for (const stage of PIPELINE_STAGES) {
      expect(stage.objective.length, stage.id).toBeGreaterThan(10);
      expect(stage.note.length, stage.id).toBeGreaterThan(20);
    }
  });

  it("describes the gate as the auditor's decision", () => {
    expect(APPROVAL_GATE.name).toMatch(/you/i);
  });
});
