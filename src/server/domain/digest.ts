import { z } from "zod";
import { CATEGORY_IDS } from "./category";

/** `YYYY-MM-DD`, the storage key and public identifier of an edition. */
export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date key");

const isoDateTimeSchema = z.iso.datetime({ offset: true });

/**
 * How consequential an item is for the audit function. Ordered, and always
 * rendered with a label rather than colour alone.
 */
export const IMPACT_LEVELS = ["act-now", "plan-for", "watch"] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

export const IMPACT_LABELS: Record<ImpactLevel, string> = {
  "act-now": "Act now",
  "plan-for": "Plan for",
  watch: "Watch",
};

/**
 * What kind of organisation published the item. Derived server-side from the
 * source's host against the catalogue, never taken from the model — it drives
 * the source-mix chart, so it has to be trustworthy.
 */
export const SOURCE_TYPES = ["regulator", "profession", "firm", "vendor", "press"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  regulator: "Regulator",
  profession: "Professional body",
  firm: "Professional services firm",
  vendor: "Technology vendor",
  press: "Trade press",
};

export const digestEntrySchema = z.object({
  id: z.string().min(1),
  category: z.enum(CATEGORY_IDS),
  /** Plain-language statement of what happened. */
  headline: z.string().min(1),
  /** Two to three sentences: what the source says, and what it changes. */
  synthesis: z.string().min(1),
  /** One line naming what the audit function should actually do about it. */
  actionRequired: z.string().min(1),
  impact: z.enum(IMPACT_LEVELS),
  /** Functions or areas this lands on, e.g. "Model risk", "Third-party". */
  affects: z.array(z.string().min(1)).max(4),
  sourceName: z.string().min(1),
  sourceUrl: z.url(),
  sourceType: z.enum(SOURCE_TYPES),
  /** Publication date of the source item, when it could be established. */
  publishedAt: dateKeySchema.optional(),
});

export type DigestEntry = z.infer<typeof digestEntrySchema>;

export const digestSchema = z.object({
  /** Equal to `date`. Present so the object is self-describing once loaded. */
  id: dateKeySchema,
  /** The date the digest is *for* — its edition date. */
  date: dateKeySchema,
  /** When the pipeline finished producing it. Always surfaced in the UI. */
  generatedAt: isoDateTimeSchema,
  coversFrom: dateKeySchema,
  coversTo: dateKeySchema,
  /** The lede: the single most consequential thing that happened. */
  summary: z.string().min(1),
  entries: z.array(digestEntrySchema),
  meta: z.object({
    trigger: z.enum(["scheduled", "manual"]),
    model: z.string(),
    /** Distinct publisher hosts the research step actually retrieved. */
    sourcesConsulted: z.number().int().nonnegative(),
    /**
     * Entries the model produced that were rejected during normalisation —
     * unknown source, unrecognised category, or too thin to be worth carrying.
     * Surfaced in the UI: a persistently non-zero value is worth investigating.
     */
    entriesRejected: z.number().int().nonnegative(),
  }),
});

export type Digest = z.infer<typeof digestSchema>;

export const digestRunSchema = z.object({
  id: z.string().min(1),
  trigger: z.enum(["scheduled", "manual"]),
  startedAt: isoDateTimeSchema,
  finishedAt: isoDateTimeSchema,
  status: z.enum(["success", "failed"]),
  digestDate: dateKeySchema.optional(),
  /** Operator-facing failure reason. Never rendered to end users verbatim. */
  error: z.string().optional(),
  /** Non-fatal problems: a category that returned nothing, a rejected entry. */
  warnings: z.array(z.string()).default([]),
});

export type DigestRun = z.infer<typeof digestRunSchema>;

/** Lightweight projection for the archive list. */
export interface DigestSummary {
  date: string;
  generatedAt: string;
  summary: string;
  entryCount: number;
  /** Entry count per category, for the archive sparkline and filters. */
  countsByCategory: Record<string, number>;
}
