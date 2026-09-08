import { describe, expect, it } from "vitest";
import { deriveStatus } from "./status";
import type { Digest, DigestRun } from "./schema";

const NOW = new Date("2026-09-08T02:00:00.000Z"); // 10:00 SGT on Tuesday 8 Sep

function digest(overrides: Partial<Digest> = {}): Digest {
  return {
    id: "2026-09-07",
    date: "2026-09-07",
    generatedAt: "2026-09-06T22:05:00.000Z",
    coversFrom: "2026-08-31",
    coversTo: "2026-09-07",
    summary: "MAS set a June deadline for board-level AI oversight.",
    entries: [],
    meta: {
      trigger: "scheduled",
      model: "claude-opus-5",
      sourcesConsulted: 11,
      ungroundedEntriesDropped: 0,
    },
    ...overrides,
  };
}

function run(overrides: Partial<DigestRun> = {}): DigestRun {
  return {
    id: "run-1",
    trigger: "scheduled",
    startedAt: "2026-09-06T22:00:00.000Z",
    finishedAt: "2026-09-06T22:05:00.000Z",
    status: "success",
    digestDate: "2026-09-07",
    warnings: [],
    ...overrides,
  };
}

describe("deriveStatus", () => {
  it("reports a recent edition with a successful last run as current", () => {
    const status = deriveStatus(digest(), run(), NOW);

    expect(status.health).toBe("current");
    expect(status.notice).toBeNull();
    expect(status.ageDays).toBe(1);
  });

  it("never presents an edition as current when the last refresh failed", () => {
    const status = deriveStatus(
      digest(),
      run({
        status: "failed",
        finishedAt: "2026-09-08T01:00:00.000Z",
        error: "Search unavailable",
        digestDate: undefined,
      }),
      NOW,
    );

    expect(status.health).toBe("refresh-failed");
    expect(status.notice?.tone).toBe("error");
    // The reader is told which edition they are actually looking at.
    expect(status.notice?.detail).toContain("7 September 2026");
  });

  it("does not report a failure that predates the edition on screen", () => {
    // A run failed, then a later run succeeded and produced this edition.
    const status = deriveStatus(
      digest(),
      run({ status: "failed", finishedAt: "2026-09-06T21:00:00.000Z" }),
      NOW,
    );

    // The stored `lastRun` here is older than the digest, so it is history.
    expect(status.health).toBe("current");
  });

  it("flags an edition older than the cadence allows", () => {
    const status = deriveStatus(
      digest({ id: "2026-08-24", date: "2026-08-24", generatedAt: "2026-08-23T22:05:00.000Z" }),
      run({ digestDate: "2026-08-24", finishedAt: "2026-08-23T22:05:00.000Z" }),
      NOW,
    );

    expect(status.health).toBe("stale");
    expect(status.notice?.tone).toBe("warning");
    expect(status.notice?.detail).toContain("15 days ago");
  });

  it("explains an empty state that has never run", () => {
    const status = deriveStatus(null, null, NOW);

    expect(status.health).toBe("empty");
    expect(status.notice?.tone).toBe("info");
    expect(status.ageDays).toBeNull();
  });

  it("distinguishes an empty state caused by a failed first run", () => {
    const status = deriveStatus(null, run({ status: "failed", digestDate: undefined }), NOW);

    expect(status.health).toBe("empty");
    expect(status.notice?.tone).toBe("error");
    expect(status.notice?.detail).toContain("failed");
  });
});
