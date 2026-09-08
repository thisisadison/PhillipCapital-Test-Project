import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { COVERAGE_DAYS, TIMEZONE } from "@/lib/config";
import type { DigestStore } from "@/lib/store";
import { CATEGORY_IDS, getCategory } from "./categories";
import { DIGEST_MODEL, getAnthropicClient } from "./client";
import { addDays, toDateKey } from "./dates";
import { groundEntries } from "./grounding";
import { researchCategory, type CategoryResearch, type ResearchWindow } from "./research";
import { hostnameOf } from "./sources";
import { synthesizeDigest } from "./synthesize";
import type { Digest, DigestRun } from "./schema";

export interface GenerateOptions {
  trigger: "scheduled" | "manual";
  /** Injected in tests; defaults to the wall clock. */
  now?: Date;
  client?: Anthropic;
}

export interface GenerateResult {
  digest: Digest;
  run: DigestRun;
}

/**
 * Runs the full pipeline: research each category, synthesise one digest from
 * the combined notes, discard anything ungrounded, persist the result.
 *
 * Every attempt is recorded — including failures, with the reason — before this
 * returns or throws. The UI reads that record to decide whether it can present
 * the stored edition as current, which is what stops a failed Monday from
 * silently showing last week's page as if it were this week's.
 */
export async function generateDigest(
  store: DigestStore,
  options: GenerateOptions,
): Promise<GenerateResult> {
  const now = options.now ?? new Date();
  const startedAt = now.toISOString();
  const runId = randomUUID();

  const editionDate = toDateKey(now, TIMEZONE);
  const window: ResearchWindow = {
    from: addDays(editionDate, -COVERAGE_DAYS),
    to: editionDate,
  };

  try {
    const client = options.client ?? getAnthropicClient();
    const { research, warnings: researchWarnings } = await runResearch(client, window);

    const { draft, warnings: synthesisWarnings } = await synthesizeDigest(client, research, window);

    const allSources = research.flatMap((item) => item.sources);
    const grounded = groundEntries(draft.entries, allSources);

    if (grounded.entries.length === 0) {
      throw new Error(
        "No entry survived source grounding — every synthesised item cited a URL that was " +
          "not returned by the search step.",
      );
    }

    const digest: Digest = {
      id: editionDate,
      date: editionDate,
      generatedAt: new Date().toISOString(),
      coversFrom: window.from,
      coversTo: window.to,
      summary: draft.summary,
      entries: grounded.entries,
      meta: {
        trigger: options.trigger,
        model: DIGEST_MODEL,
        sourcesConsulted: countDistinctHosts(allSources.map((source) => source.url)),
        ungroundedEntriesDropped: grounded.dropped,
      },
    };

    await store.save(digest);

    const run: DigestRun = {
      id: runId,
      trigger: options.trigger,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "success",
      digestDate: digest.date,
      warnings: [...researchWarnings, ...synthesisWarnings, ...grounded.warnings],
    };
    await store.recordRun(run);

    return { digest, run };
  } catch (error) {
    const run: DigestRun = {
      id: runId,
      trigger: options.trigger,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "failed",
      error: describeError(error),
      warnings: [],
    };
    // Recording the failure must not mask the failure itself.
    await store.recordRun(run).catch((recordError) => {
      console.error("[pipeline] Failed to record a failed run.", recordError);
    });

    throw error;
  }
}

/**
 * Researches all categories concurrently. One category failing is a warning,
 * not a failed run — a MAS outage should not cost the team the other two
 * sections. All three failing means the run has nothing to synthesise.
 */
async function runResearch(
  client: Anthropic,
  window: ResearchWindow,
): Promise<{ research: CategoryResearch[]; warnings: string[] }> {
  const settled = await Promise.allSettled(
    CATEGORY_IDS.map((categoryId) => researchCategory(client, categoryId, window)),
  );

  const research: CategoryResearch[] = [];
  const warnings: string[] = [];
  const failures: string[] = [];

  settled.forEach((outcome, index) => {
    const categoryId = CATEGORY_IDS[index]!;
    const label = getCategory(categoryId).label;

    if (outcome.status === "fulfilled") {
      research.push(outcome.value);
      warnings.push(...outcome.value.warnings);
      return;
    }

    const reason = describeError(outcome.reason);
    failures.push(`${label}: ${reason}`);
    warnings.push(`Research for "${label}" failed and that section may be missing (${reason}).`);
  });

  if (research.length === 0) {
    throw new Error(`Research failed for every category. ${failures.join("; ")}`);
  }

  return { research, warnings };
}

function countDistinctHosts(urls: string[]): number {
  return new Set(urls.map((url) => hostnameOf(url)).filter((host): host is string => host !== null))
    .size;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
