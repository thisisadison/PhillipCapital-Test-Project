import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileDigestRepository } from "./FileDigestRepository";
import type { Digest, DigestRun } from "@/server/domain/digest";

let root: string;
let repository: FileDigestRepository;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "digest-store-"));
  repository = new FileDigestRepository(root);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function digest(date: string, overrides: Partial<Digest> = {}): Digest {
  return {
    id: date,
    date,
    generatedAt: `${date}T02:00:00.000Z`,
    coversFrom: date,
    coversTo: date,
    summary: `The edition of ${date}.`,
    entries: [
      {
        id: "abc123abc123",
        category: "regulatory",
        headline: "MAS sets a deadline for board-level AI oversight",
        synthesis:
          "MAS gave banks until 30 June to evidence board oversight of production AI. Audit will " +
          "need to test that the reporting line exists in practice, not just in policy.",
        actionRequired: "Request the board pack showing AI oversight before the June deadline.",
        impact: "act-now",
        affects: ["Model risk", "Board reporting"],
        sourceName: "MAS",
        sourceUrl: "https://www.mas.gov.sg/publications/ai-oversight",
        sourceType: "regulator",
      },
    ],
    meta: {
      trigger: "scheduled",
      model: "claude-opus-5",
      sourcesConsulted: 9,
      entriesRejected: 0,
    },
    ...overrides,
  };
}

function run(id: string, finishedAt: string, overrides: Partial<DigestRun> = {}): DigestRun {
  return {
    id,
    trigger: "scheduled",
    startedAt: finishedAt,
    finishedAt,
    status: "success",
    warnings: [],
    ...overrides,
  };
}

describe("FileDigestRepository", () => {
  it("reports nothing before any digest has run", async () => {
    expect(await repository.findLatest()).toBeNull();
    expect(await repository.findLastRun()).toBeNull();
    expect(await repository.listSummaries(10)).toEqual([]);
  });

  it("round-trips a digest", async () => {
    await repository.save(digest("2026-09-07"));
    expect(await repository.findByDate("2026-09-07")).toEqual(digest("2026-09-07"));
  });

  it("returns the newest edition as the latest", async () => {
    await repository.save(digest("2026-08-31"));
    await repository.save(digest("2026-09-07"));
    await repository.save(digest("2026-09-01"));

    expect((await repository.findLatest())?.date).toBe("2026-09-07");
    expect((await repository.listSummaries(10)).map((entry) => entry.date)).toEqual([
      "2026-09-07",
      "2026-09-01",
      "2026-08-31",
    ]);
  });

  it("refuses a path-traversal date key instead of reading outside the data directory", async () => {
    await expect(repository.findByDate("../../etc/passwd")).resolves.toBeNull();
    await expect(repository.findByDate("2026-09-07/../../secrets")).resolves.toBeNull();
  });

  it("ignores a stored digest that no longer matches the schema", async () => {
    await mkdir(join(root, "digests"), { recursive: true });
    await writeFile(join(root, "digests", "2026-09-07.json"), '{"date":"2026-09-07"}', "utf8");

    // A malformed edition is treated as absent rather than crashing the page or,
    // worse, rendering half of it.
    expect(await repository.findByDate("2026-09-07")).toBeNull();
    expect(await repository.findLatest()).toBeNull();
  });

  it("treats an unparseable run log as empty rather than failing", async () => {
    await writeFile(join(root, "runs.json"), "{ not json", "utf8");
    expect(await repository.listRuns(10)).toEqual([]);
  });

  it("keeps run records newest first", async () => {
    await repository.recordRun(run("a", "2026-09-01T00:00:00.000Z"));
    await repository.recordRun(run("b", "2026-09-07T00:00:00.000Z"));

    expect((await repository.findLastRun())?.id).toBe("b");
    expect((await repository.listRuns(5)).map((entry) => entry.id)).toEqual(["b", "a"]);
  });

  it("records a failed run alongside its reason", async () => {
    await repository.recordRun(
      run("f", "2026-09-07T00:00:00.000Z", { status: "failed", error: "Search unavailable" }),
    );

    const last = await repository.findLastRun();
    expect(last?.status).toBe("failed");
    expect(last?.error).toBe("Search unavailable");
  });

  it("does not lose records when runs are written concurrently", async () => {
    // Two processes finishing at once must not clobber each other's record —
    // this is what the file lock around the read-modify-write is for.
    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        repository.recordRun(run(`r${index}`, `2026-09-0${(index % 9) + 1}T00:00:0${index % 10}.000Z`)),
      ),
    );

    const runs = await repository.listRuns(50);
    expect(runs).toHaveLength(12);
    expect(new Set(runs.map((entry) => entry.id)).size).toBe(12);
  });
});
