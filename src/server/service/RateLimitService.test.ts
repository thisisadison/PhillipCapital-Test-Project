import { describe, expect, it } from "vitest";
import { evaluateManualTrigger } from "./RateLimitService";
import { MANUAL_COOLDOWN_MINUTES, MANUAL_RUNS_PER_DAY } from "@/server/config";
import type { DigestRun } from "@/server/domain/digest";

const NOW = new Date("2026-09-08T02:00:00.000Z");

function run(minutesAgo: number, trigger: DigestRun["trigger"] = "manual"): DigestRun {
  const finishedAt = new Date(NOW.getTime() - minutesAgo * 60_000).toISOString();
  return {
    id: `run-${minutesAgo}-${trigger}`,
    trigger,
    startedAt: finishedAt,
    finishedAt,
    status: "success",
    digestDate: "2026-09-07",
    warnings: [],
  };
}

describe("evaluateManualTrigger", () => {
  it("allows a run when nothing has happened yet", () => {
    expect(evaluateManualTrigger([], NOW)).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("blocks a run inside the cooldown and says how long is left", () => {
    const decision = evaluateManualTrigger([run(MANUAL_COOLDOWN_MINUTES - 5)], NOW);

    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBe(5 * 60);
    expect(decision.reason).toContain("one every");
  });

  it("allows a run once the cooldown has elapsed", () => {
    expect(evaluateManualTrigger([run(MANUAL_COOLDOWN_MINUTES + 1)], NOW).allowed).toBe(true);
  });

  it("counts a recent scheduled run towards the cooldown", () => {
    // The content will not have changed since a scheduled run minutes ago.
    const decision = evaluateManualTrigger([run(1, "scheduled")], NOW);
    expect(decision.allowed).toBe(false);
  });

  it("does not claim a refresh happened when the recent run failed", () => {
    const failed: DigestRun = { ...run(1, "scheduled"), status: "failed", error: "boom" };
    const decision = evaluateManualTrigger([failed], NOW);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("A digest run finished");
    expect(decision.reason).not.toContain("refreshed");
  });

  it("enforces the daily ceiling on manual runs", () => {
    const runs = Array.from({ length: MANUAL_RUNS_PER_DAY }, (_, index) =>
      run(MANUAL_COOLDOWN_MINUTES + 10 + index * 60),
    );
    const decision = evaluateManualTrigger(runs, NOW);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("daily limit");
    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("does not count scheduled runs towards the daily ceiling", () => {
    const runs = Array.from({ length: MANUAL_RUNS_PER_DAY + 4 }, (_, index) =>
      run(MANUAL_COOLDOWN_MINUTES + 10 + index * 60, "scheduled"),
    );

    expect(evaluateManualTrigger(runs, NOW).allowed).toBe(true);
  });

  it("lets the window roll off after a day", () => {
    const runs = Array.from({ length: MANUAL_RUNS_PER_DAY }, (_, index) =>
      run(24 * 60 + 10 + index, "manual"),
    );

    expect(evaluateManualTrigger(runs, NOW).allowed).toBe(true);
  });
});
