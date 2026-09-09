import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { COVERAGE_DAYS, TIMEZONE } from "@/server/config";
import { CATEGORY_IDS, getCategory } from "@/server/domain/category";
import type { Digest, DigestRun } from "@/server/domain/digest";
import type { DigestRepository } from "@/server/repository";
import { addDays, toDateKey } from "@/shared/dates";
import { getAnthropicClient, MODEL_DESCRIPTION } from "./AnthropicClient";
import { hostnameOf } from "@/shared/url";
import {
  addUsage,
  estimateTotalCostUsd,
  formatUsd,
  ZERO_USAGE,
  type UsageTotals,
} from "./UsageTracking";
import {
  researchCategory,
  type CategoryResearch,
  type ResearchWindow,
} from "./research/ResearchService";
import { normaliseDraft } from "./synthesis/normalise";
import { SourceIndex } from "./synthesis/sourceIndex";
import { synthesizeDigest } from "./synthesis/SynthesisService";

export interface GenerateOptions {
  trigger: "scheduled" | "manual";
  /** Injected in tests; defaults to the wall clock. */
  now?: Date;
  client?: Anthropic;
}

export interface GenerateResult {
  digest: Digest;
  run: DigestRun;
  /** Total token usage across every call this run made. Not persisted — logging only. */
  usage: { research: UsageTotals; synthesis: UsageTotals; estimatedCostUsd: number };
}

/**
 * Orchestrates the pipeline: research every category, synthesise one draft from
 * the combined notes, normalise it into publishable entries, persist.
 *
 * Partial failure is designed for at every stage. A category that fails costs
 * that section, not the edition; an entry that cannot be trusted costs that
 * entry. The run only fails when there is genuinely nothing to publish.
 *
 * Every attempt is recorded — including failures, with the reason — before this
 * returns or throws. The UI reads that record to decide whether it can present
 * the stored edition as current.
 */
export async function generateDigest(
  repository: DigestRepository,
  options: GenerateOptions,
): Promise<GenerateResult> {
  const now = options.now ?? new Date();
  const startedAt = now.toISOString();
  const runId = randomUUID();

  const editionDate = toDateKey(now, TIMEZONE);
  const window: ResearchWindow = { from: addDays(editionDate, -COVERAGE_DAYS), to: editionDate };

  try {
    const client = options.client ?? getAnthropicClient();
    const { research, warnings: researchWarnings } = await runResearch(client, window);

    const researchUsage = research.reduce((total, item) => addUsage(total, item.usage), ZERO_USAGE);

    const sources = new SourceIndex(research.flatMap((item) => item.sources));
    if (sources.size === 0) {
      throw new Error("The research step retrieved no sources, so there is nothing to cite.");
    }

    const { draft, warnings: synthesisWarnings, usage: synthesisUsage } = await synthesizeDigest(
      client,
      research,
      sources,
      window,
    );
    const normalised = normaliseDraft(draft, sources);

    const estimatedCostUsd = estimateTotalCostUsd(researchUsage, synthesisUsage);
    console.log(`[digest] Estimated run cost: ${formatUsd(estimatedCostUsd)}`);

    if (normalised.entries.length === 0) {
      throw new Error(
        `Every synthesised entry was rejected during normalisation. ${normalised.rejections.join(" ")}`,
      );
    }

    const digest: Digest = {
      id: editionDate,
      date: editionDate,
      generatedAt: new Date().toISOString(),
      coversFrom: window.from,
      coversTo: window.to,
      summary: normalised.summary,
      entries: normalised.entries,
      meta: {
        trigger: options.trigger,
        model: MODEL_DESCRIPTION,
        sourcesConsulted: countDistinctHosts(sources.sources.map((source) => source.url)),
        entriesRejected: normalised.rejections.length,
      },
    };

    await repository.save(digest);

    const run: DigestRun = {
      id: runId,
      trigger: options.trigger,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "success",
      digestDate: digest.date,
      warnings: [...researchWarnings, ...synthesisWarnings, ...normalised.rejections],
    };
    await repository.recordRun(run);

    return { digest, run, usage: { research: researchUsage, synthesis: synthesisUsage, estimatedCostUsd } };
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
    await repository.recordRun(run).catch((recordError) => {
      console.error("[digest] Failed to record a failed run.", recordError);
    });

    throw error;
  }
}

/**
 * Researches all categories concurrently. One category failing is a warning,
 * not a failed run — a MAS outage should not cost the team the other four.
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
    const label = getCategory(CATEGORY_IDS[index]!).label;

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
  return new Set(urls.map(hostnameOf).filter((host): host is string => host !== null)).size;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
