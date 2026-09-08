import { createHash } from "node:crypto";
import { resolveCategoryId } from "@/server/domain/category";
import { IMPACT_LEVELS, type DigestEntry, type ImpactLevel } from "@/server/domain/digest";
import type { Draft, DraftEntry } from "./draftSchema";
import type { SourceIndex } from "./sourceIndex";

/** Below this a synthesis is restating its headline rather than adding to it. */
const MIN_SYNTHESIS_CHARS = 80;
const MAX_SYNTHESIS_CHARS = 900;
const MAX_HEADLINE_CHARS = 140;
const MAX_ACTION_CHARS = 220;
const MAX_AFFECTS = 4;
const MAX_ENTRIES = 20;

export interface NormalisedDraft {
  summary: string;
  entries: DigestEntry[];
  /** One line per rejected entry, carried onto the run record. */
  rejections: string[];
}

/**
 * Turns the model's draft into publishable entries.
 *
 * The governing rule: a problem with one entry costs that entry, never the
 * edition. Anything that can be repaired deterministically is repaired
 * (whitespace, category casing, an unknown impact level); anything that cannot
 * be trusted is dropped with a reason recorded. The run only fails if nothing
 * survives at all, which is a genuinely empty result rather than a parse error.
 */
export function normaliseDraft(draft: Draft, sources: SourceIndex): NormalisedDraft {
  const entries: DigestEntry[] = [];
  const rejections: string[] = [];
  // Keyed by catalogue id (S07), which is what identifies a source here.
  const seenSourceIds = new Set<string>();

  for (const raw of draft.entries.slice(0, MAX_ENTRIES)) {
    const outcome = normaliseEntry(raw, sources, seenSourceIds);

    if ("reason" in outcome) {
      rejections.push(`Dropped "${label(raw.headline)}" — ${outcome.reason}.`);
      continue;
    }

    seenSourceIds.add(outcome.sourceId);
    entries.push(outcome.entry);
  }

  return { summary: collapse(draft.summary), entries, rejections };
}

type EntryOutcome = { entry: DigestEntry; sourceId: string } | { reason: string };

function normaliseEntry(
  raw: DraftEntry,
  sources: SourceIndex,
  seenSourceIds: Set<string>,
): EntryOutcome {
  const source = sources.resolve(raw.sourceId);
  if (!source) return { reason: `it cited an unknown source (${label(raw.sourceId, 12)})` };
  if (seenSourceIds.has(source.id)) return { reason: "it duplicates an earlier entry" };

  const category = resolveCategoryId(raw.category);
  if (!category) return { reason: `its category "${label(raw.category, 24)}" is not one of ours` };

  const headline = collapse(raw.headline);
  if (!headline) return { reason: "it has no headline" };

  const synthesis = collapse(raw.synthesis);
  if (synthesis.length < MIN_SYNTHESIS_CHARS) {
    return { reason: "its synthesis adds nothing beyond the headline" };
  }

  const actionRequired = collapse(raw.actionRequired);
  if (!actionRequired) return { reason: "it does not say what audit should do about it" };

  return {
    sourceId: source.id,
    entry: {
      // Stable across regenerations of the same source, so React keys hold.
      id: hashId(source.url),
      category,
      headline: clamp(headline, MAX_HEADLINE_CHARS),
      synthesis: clamp(synthesis, MAX_SYNTHESIS_CHARS),
      actionRequired: clamp(actionRequired, MAX_ACTION_CHARS),
      impact: normaliseImpact(raw.impact),
      affects: normaliseAffects(raw.affects),
      sourceName: sourceNameFor(source.title, source.url),
      sourceUrl: source.url,
      sourceType: source.type,
      ...(normalisePublishedAt(raw.publishedAt) ?? {}),
    },
  };
}

/** Unknown or missing impact is treated as the least urgent, never invented upward. */
function normaliseImpact(raw: string): ImpactLevel {
  const key = raw.trim().toLowerCase().replace(/[^a-z]/g, "");

  for (const level of IMPACT_LEVELS) {
    if (level.replace(/[^a-z]/g, "") === key) return level;
  }
  if (key.startsWith("act") || key === "high" || key === "urgent") return "act-now";
  if (key.startsWith("plan") || key === "medium") return "plan-for";
  return "watch";
}

function normaliseAffects(raw: string[]): string[] {
  const cleaned = raw
    .map((value) => clamp(collapse(value), 40))
    .filter((value) => value.length > 0);

  return [...new Set(cleaned)].slice(0, MAX_AFFECTS);
}

function normalisePublishedAt(raw: string | undefined): { publishedAt: string } | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // A calendar-impossible date does not throw — JavaScript rolls it forward, so
  // 2026-02-31 silently becomes 3 March. Round-tripping is what catches it.
  if (parsed.toISOString().slice(0, 10) !== trimmed) return null;

  return { publishedAt: trimmed };
}

/**
 * A readable publisher name from the source itself.
 *
 * Titles usually end with the publisher ("... | MAS"), which is more accurate
 * than anything the model would invent, and falls back to the host.
 */
function sourceNameFor(title: string, url: string): string {
  const tail = title.split(/\s[|–—-]\s/).pop()?.trim();
  if (tail && tail.length >= 2 && tail.length <= 40 && tail !== title.trim()) return tail;

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Source";
  }
}

function hashId(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clamp(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

function label(value: string, max = 60): string {
  const collapsed = collapse(value);
  if (!collapsed) return "untitled";
  return collapsed.length <= max ? collapsed : `${collapsed.slice(0, max - 1)}…`;
}
