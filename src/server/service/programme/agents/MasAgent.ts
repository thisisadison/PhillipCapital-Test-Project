import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { RESEARCH_MODEL } from "@/server/service/AnthropicClient";
import { addUsage, usageFrom, ZERO_USAGE, type UsageTotals } from "@/server/service/UsageTracking";
import {
  AML_PROGRAMME_DOMAINS,
  MAX_ALLOWED_DOMAINS,
} from "@/server/service/research/sourceCatalogue";
import { SourceIndex } from "@/server/service/synthesis/sourceIndex";
import type { RetrievedSource } from "@/server/service/research/ResearchService";
import type { Obligation } from "@/server/domain/programme";
import { OBLIGATION_THEMES, formatThemes, resolveThemeId } from "@/server/domain/masFramework";
import { describeIntake, type RiskIntake } from "@/server/domain/riskIntake";
import { betaFieldsFor, clamp, collapse, effortFor, hashId, tuningFor } from "./shared";

/**
 * MAS Agent — establishes which obligations actually apply to this firm.
 *
 * The only agent in the pipeline with network access, and the only one that
 * costs search fees, so it is capped tightly. It runs in two passes: a search
 * conversation that reads the instruments, then a structured extraction that
 * turns what it read into citable obligations. The split exists because asking
 * one call to both search and emit strict JSON reliably produces worse of both.
 */

const MAX_SEARCHES = numberFromEnv("PROGRAMME_MAX_SEARCHES", 4);
const MAX_PAUSE_CONTINUATIONS = 2;

const draftSchema = z.object({
  obligations: z.array(
    z.object({
      reference: z.string(),
      requirement: z.string(),
      /** One of the obligation theme ids. Resolved leniently; null is acceptable. */
      theme: z.string(),
      /** Catalogue handle. The model never writes a URL. */
      sourceId: z.string(),
    }),
  ),
});

const SEARCH_SYSTEM_PROMPT = [
  "You are a financial crime compliance specialist establishing the AML/CFT obligations that apply",
  "to a Singapore capital markets firm, for an Internal Audit team that will test against them.",
  "",
  "You are assembling audit criteria, not writing an overview. What matters is the instrument, the",
  "paragraph, and what it actually requires a firm to do.",
  "",
  "Work from the search results only. Never cite a notice or paragraph number the results did not",
  "show you, and never state a URL that did not appear in a result.",
].join("\n");

const EXTRACT_SYSTEM_PROMPT = [
  "You convert research notes about AML/CFT obligations into a structured list.",
  "",
  "Every obligation must be traceable to a source in the catalogue you are given. If the notes",
  "mention a requirement you cannot tie to a catalogue entry, leave it out — an obligation an",
  "auditor cannot open and read is worse than one fewer obligation.",
].join("\n");

export interface MasAgentResult {
  obligations: Obligation[];
  sources: SourceIndex;
  notes: string[];
  usage: UsageTotals;
}

export async function runMasAgent(client: Anthropic, intake: RiskIntake): Promise<MasAgentResult> {
  const notes: string[] = [];
  let usage: UsageTotals = ZERO_USAGE;

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: [
        "Establish the AML/CFT obligations an internal audit of this firm would test against.",
        "",
        "## The firm",
        describeIntake(intake),
        "",
        "## What to find",
        "The applicable MAS requirements first — the relevant Notice and its paragraphs — then FATF",
        "or Wolfsberg guidance where it adds something MAS does not cover. Prioritise obligations",
        "the profile above actually implicates, and ignore obligations for business this firm does",
        "not conduct.",
        "",
        "## Themes to cover",
        "Work through these, spending your searches on the ones this firm's profile implicates most.",
        "You are not required to reach all of them — an honest gap is better than a padded citation.",
        "",
        formatThemes(),
        "",
        "For each obligation record the instrument and paragraph, what it requires, and the URL of",
        "the result you took it from. Write prose notes.",
      ].join("\n"),
    },
  ];

  const retrieved = new Map<string, RetrievedSource>();
  const textParts: string[] = [];

  for (let attempt = 0; attempt <= MAX_PAUSE_CONTINUATIONS; attempt += 1) {
    const response = await client.beta.messages.create({
      model: RESEARCH_MODEL,
      max_tokens: 8000,
      ...tuningFor(RESEARCH_MODEL),
      system: [
        { type: "text", text: SEARCH_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
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
        notes.push(`A source search failed (${block.content.error_code}).`);
        continue;
      }
      for (const result of block.content) {
        if (result.type !== "web_search_result") continue;
        retrieved.set(result.url, {
          url: result.url,
          title: result.title,
          pageAge: result.page_age,
        });
      }
    }

    if (response.stop_reason === "refusal") throw new Error("The obligations search was declined.");
    if (response.stop_reason !== "pause_turn") break;

    messages.push({ role: "assistant", content: response.content });
  }

  const sources = new SourceIndex([...retrieved.values()]);
  if (sources.size === 0) {
    throw new Error("No source could be retrieved, so no obligation could be cited.");
  }

  const extraction = await client.beta.messages.parse({
    model: RESEARCH_MODEL,
    max_tokens: 6000,
    ...betaFieldsFor(RESEARCH_MODEL),
    output_config: { ...effortFor(RESEARCH_MODEL), format: zodOutputFormat(draftSchema) },
    system: EXTRACT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          "Turn these notes into a structured list of obligations.",
          "",
          "## Notes",
          textParts.join("\n\n").trim() || "_Nothing was established._",
          "",
          "## Source catalogue",
          "Cite by id. You never write a URL.",
          "",
          sources.format(),
          "",
          "## Themes",
          formatThemes(),
          "",
          "Return `reference` (instrument and paragraph), `requirement` (what it requires, one or",
          "two sentences), `theme` (one theme id from the list above), and `sourceId`. Six to",
          "twelve obligations.",
        ].join("\n"),
      },
    ],
  });

  usage = addUsage(usage, usageFrom(extraction));
  if (!extraction.parsed_output) throw new Error("The obligations list returned nothing usable.");

  const obligations: Obligation[] = [];
  const seen = new Set<string>();

  for (const raw of extraction.parsed_output.obligations.slice(0, 14)) {
    const source = sources.resolve(raw.sourceId);
    const reference = collapse(raw.reference);
    const requirement = collapse(raw.requirement);

    if (!source) {
      notes.push(`Dropped "${reference || "an obligation"}" — cited an unknown source.`);
      continue;
    }
    if (!reference || !requirement) continue;
    if (seen.has(reference.toLowerCase())) continue;
    seen.add(reference.toLowerCase());

    obligations.push({
      id: hashId(reference),
      reference: clamp(reference, 160),
      requirement: clamp(requirement, 500),
      theme: resolveThemeId(raw.theme),
      sourceName: source.title.split(/\s[|–—-]\s/).pop()?.trim() || source.url,
      sourceUrl: source.url,
    });
  }

  if (obligations.length === 0) {
    throw new Error("No obligation survived source checking, so there is nothing to test against.");
  }

  // Coverage is reported, never quietly padded. A theme the search did not
  // reach is a real gap in the programme and the auditor has to see it.
  const covered = new Set(obligations.flatMap((item) => (item.theme ? [item.theme] : [])));
  const missed = OBLIGATION_THEMES.filter((theme) => !covered.has(theme.id));
  if (missed.length > 0) {
    notes.push(
      `No obligation found for ${missed.length} theme${missed.length === 1 ? "" : "s"}: ${missed
        .map((theme) => theme.label)
        .join(", ")}.`,
    );
  }

  return { obligations, sources, notes, usage };
}

function numberFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]?.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
