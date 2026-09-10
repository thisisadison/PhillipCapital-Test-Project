import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { TIMEZONE } from "@/server/config";
import type { AuditProgramme } from "@/server/domain/programme";
import type { ProgrammeRepository } from "@/server/repository/ProgrammeRepository";
import { toDateKey } from "@/shared/dates";
import { hostnameOf } from "@/shared/url";
import {
  FALLBACK_BETA,
  MODEL_DESCRIPTION,
  RESEARCH_MODEL,
  SYNTHESIS_MODEL,
  getAnthropicClient,
  supportsNewerRequestFeatures,
} from "../AnthropicClient";
import { AML_PROGRAMME_DOMAINS, MAX_ALLOWED_DOMAINS } from "../research/sourceCatalogue";
import type { RetrievedSource } from "../research/ResearchService";
import { SourceIndex } from "../synthesis/sourceIndex";
import { addUsage, formatUsageLine, usageFrom, ZERO_USAGE, type UsageTotals } from "../UsageTracking";
import { normaliseProgramme } from "./normaliseProgramme";
import { programmeDraftSchema } from "./programmeDraftSchema";

/**
 * Generating an audit programme is deliberately cheaper than a digest run: one
 * research conversation rather than five. These caps keep it that way.
 */
const MAX_SEARCHES = numberFromEnv("PROGRAMME_MAX_SEARCHES", 4);
const MAX_PAUSE_CONTINUATIONS = 2;
const RESEARCH_MAX_TOKENS = 8000;
const DRAFT_MAX_TOKENS = 12000;

const RESEARCH_SYSTEM_PROMPT = [
  "You are a financial crime compliance specialist supporting an Internal Audit team at a",
  "Singapore capital markets and brokerage firm.",
  "",
  "Your job is to establish what the applicable AML/CFT obligations actually are — the specific",
  "instruments, paragraphs and expectations an auditor would test a firm against. You are not",
  "writing an overview; you are assembling the criteria an audit will be evidenced against.",
  "",
  "Work from the search results only. Never state a URL that did not appear in a search result,",
  "and never cite a paragraph or notice number the results did not actually show you.",
].join("\n");

const DRAFT_SYSTEM_PROMPT = [
  "You are an experienced internal audit manager writing an audit programme for your team to",
  "execute. The reader is the auditor who will carry out the fieldwork.",
  "",
  "How you write a step:",
  "- Imperative and specific. 'Obtain the customer risk-rating methodology and reperform the",
  "  rating for a sample of 25 accounts onboarded since January' — not 'review customer risk",
  "  rating'.",
  "- Every step names what evidence to request, because that is what the auditor will chase.",
  "- Sampling guidance where a step tests a population, omitted where it does not apply.",
  "",
  "Risk-based means the coverage is proportionate: the areas the supplied risk context flags as",
  "highest risk get the most, and the most specific, steps. An area nobody flagged as risky does",
  "not need six procedures.",
  "",
  "You are a drafting aid, not the auditor. Do not assert that a control is effective, and do not",
  "conclude anything — the programme is what gets tested, not what was found.",
].join("\n");

export interface GenerateProgrammeOptions {
  /** The auditor's own risk assessment context, in their words. */
  riskContext: string;
  now?: Date;
  client?: Anthropic;
}

export interface GenerateProgrammeResult {
  programme: AuditProgramme;
  warnings: string[];
  usage: UsageTotals;
}

/**
 * Researches the applicable AML obligations, then drafts a risk-based audit
 * programme against them.
 *
 * Two stages for the same reason the digest has two: the model that searches
 * should be establishing what the rules are, and the model that writes should
 * be deciding what to test. Collapsing them produces programmes that cite
 * whatever was most recently read rather than what is most material.
 */
export async function generateProgramme(
  repository: ProgrammeRepository,
  options: GenerateProgrammeOptions,
): Promise<GenerateProgrammeResult> {
  const now = options.now ?? new Date();
  const client = options.client ?? getAnthropicClient();
  const riskContext = options.riskContext.trim();

  const research = await researchObligations(client, riskContext);
  const sources = new SourceIndex(research.sources);

  if (sources.size === 0) {
    throw new Error(
      "No source could be retrieved for the applicable AML obligations, so there is nothing to " +
        "cite. The programme was not generated.",
    );
  }

  const draft = await draftProgramme(client, riskContext, research.notes, sources);
  const normalised = normaliseProgramme(draft.draft, sources);

  if (normalised.sections.length === 0) {
    throw new Error(
      `Every drafted section was rejected during checks. ${normalised.rejections.join(" ")}`,
    );
  }

  const programme: AuditProgramme = {
    id: `${toDateKey(now, TIMEZONE)}-${randomUUID().slice(0, 6)}`,
    title: normalised.title,
    generatedAt: now.toISOString(),
    riskContext,
    scopeSummary: normalised.scopeSummary,
    sections: normalised.sections,
    meta: {
      model: MODEL_DESCRIPTION,
      sourcesConsulted: new Set(
        sources.sources.map((source) => hostnameOf(source.url)).filter(Boolean),
      ).size,
      sectionsRejected: normalised.rejections.length,
    },
  };

  await repository.save(programme);

  const usage = addUsage(research.usage, draft.usage);
  console.log(`[programme] total: ${formatUsageLine(usage, SYNTHESIS_MODEL)}`);

  return {
    programme,
    warnings: [...research.warnings, ...normalised.rejections],
    usage,
  };
}

async function researchObligations(
  client: Anthropic,
  riskContext: string,
): Promise<{ notes: string; sources: RetrievedSource[]; warnings: string[]; usage: UsageTotals }> {
  const newerFeatures = supportsNewerRequestFeatures(RESEARCH_MODEL);
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: [
        "Establish the AML/CFT obligations an internal audit of this firm would test against.",
        "",
        "## The firm's risk context, as supplied by the auditor",
        riskContext,
        "",
        "## What to find",
        "The applicable MAS requirements first — the relevant Notice and its paragraphs — then FATF",
        "recommendations and Wolfsberg guidance where they add something MAS does not cover.",
        "Prioritise the obligations that the risk context above actually implicates. Ignore",
        "obligations for business the firm plainly does not conduct.",
        "",
        "For each obligation, record: the instrument and paragraph, what it actually requires, and",
        "the exact URL of the search result you took it from.",
        "",
        "Write prose notes, not JSON.",
      ].join("\n"),
    },
  ];

  const warnings: string[] = [];
  const sources = new Map<string, RetrievedSource>();
  const textParts: string[] = [];
  let usage: UsageTotals = ZERO_USAGE;

  for (let attempt = 0; attempt <= MAX_PAUSE_CONTINUATIONS; attempt += 1) {
    const response = await client.beta.messages.create({
      model: RESEARCH_MODEL,
      max_tokens: RESEARCH_MAX_TOKENS,
      ...(newerFeatures
        ? {
            betas: [FALLBACK_BETA],
            fallbacks: "default" as const,
            thinking: { type: "adaptive" as const },
            output_config: { effort: "medium" as const },
          }
        : {}),
      system: [{ type: "text", text: RESEARCH_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: MAX_SEARCHES,
          allowed_domains: AML_PROGRAMME_DOMAINS.slice(0, MAX_ALLOWED_DOMAINS),
        },
      ],
      messages,
    });

    usage = addUsage(usage, usageFrom(response));

    for (const block of response.content) {
      if (block.type === "text") textParts.push(block.text);
      if (block.type !== "web_search_tool_result") continue;

      if (!Array.isArray(block.content)) {
        warnings.push(`A source search failed (${block.content.error_code}).`);
        continue;
      }
      for (const result of block.content) {
        if (result.type !== "web_search_result") continue;
        sources.set(result.url, {
          url: result.url,
          title: result.title,
          pageAge: result.page_age,
        });
      }
    }

    if (response.stop_reason === "refusal") {
      throw new Error("The model declined to research the applicable obligations.");
    }
    if (response.stop_reason !== "pause_turn") break;

    messages.push({ role: "assistant", content: response.content });
  }

  return {
    notes: textParts.join("\n\n").trim(),
    sources: [...sources.values()],
    warnings,
    usage,
  };
}

async function draftProgramme(
  client: Anthropic,
  riskContext: string,
  notes: string,
  sources: SourceIndex,
): Promise<{ draft: ReturnType<typeof programmeDraftSchema.parse>; usage: UsageTotals }> {
  const newerFeatures = supportsNewerRequestFeatures(SYNTHESIS_MODEL);

  const response = await client.beta.messages.parse({
    model: SYNTHESIS_MODEL,
    max_tokens: DRAFT_MAX_TOKENS,
    ...(newerFeatures
      ? {
          betas: [FALLBACK_BETA],
          fallbacks: "default" as const,
          thinking: { type: "adaptive" as const },
        }
      : {}),
    output_config: {
      ...(newerFeatures ? { effort: "medium" as const } : {}),
      format: zodOutputFormat(programmeDraftSchema),
    },
    system: DRAFT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          "Write a risk-based internal audit programme for AML/CFT at this firm.",
          "",
          "## The auditor's risk context",
          riskContext,
          "",
          "## Obligations established by research",
          notes || "_No obligations were established._",
          "",
          "## Source catalogue",
          "Cite a source by its id. You never write a URL.",
          "",
          sources.format(),
          "",
          "## Output",
          "- `title` — names the firm's scope, e.g. 'AML/CFT Internal Audit Programme'.",
          "- `scopeSummary` — one paragraph: what this programme covers and what it deliberately",
          "  excludes. Be explicit about the exclusions; an auditor needs to know the boundary.",
          "- `sections` — one per control area. Each carries:",
          "  - `title`, e.g. 'Customer Due Diligence at onboarding'",
          "  - `riskRating` — `high`, `medium` or `low`, justified by the risk context above",
          "  - `rationale` — why this area is in scope *for this firm*, referencing the risk context",
          "  - `requirementReference` — the instrument and paragraph, e.g. 'MAS Notice 626 para 6'",
          "  - `sourceId` — the catalogue id the requirement came from",
          "  - `steps` — each with `procedure` (imperative, specific), `evidenceRequired`, and",
          "    `sampling` where a population is being tested",
          "",
          "Give the high-risk areas the most and the most specific steps. Six to nine sections in",
          "total; fewer if the risk context genuinely does not warrant more.",
        ].join("\n"),
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to draft the programme.");
  }
  if (!response.parsed_output) {
    throw new Error(
      `The draft came back unusable (stop reason: ${response.stop_reason ?? "unknown"}).`,
    );
  }

  return { draft: response.parsed_output, usage: usageFrom(response) };
}

function numberFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]?.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
