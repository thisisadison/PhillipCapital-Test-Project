import { z } from "zod";
import { CATEGORY_IDS } from "./categories";

/** `YYYY-MM-DD`, used as the storage key and the public identifier of a digest. */
export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date key");

const isoDateTimeSchema = z.iso.datetime({ offset: true });

/**
 * The shape the model is asked to produce for one item. Kept deliberately
 * small: a headline, a synthesis that has to earn its place, and a source.
 */
export const digestEntryDraftSchema = z.object({
  category: z.enum(CATEGORY_IDS),
  headline: z
    .string()
    .min(15, "Headline is too short to be informative")
    .max(120, "Headline should read as a sentence fragment, not a paragraph"),
  synthesis: z
    .string()
    .min(120, "A synthesis this short is unlikely to add anything beyond the headline")
    .max(700, "Synthesis should be two to three sentences"),
  sourceName: z.string().min(2).max(80),
  sourceUrl: z.url(),
  /** Publication date of the source item, when it could be established. */
  publishedAt: dateKeySchema.optional(),
});

export type DigestEntryDraft = z.infer<typeof digestEntryDraftSchema>;

export const digestEntrySchema = digestEntryDraftSchema.extend({
  id: z.string().min(1),
});

export type DigestEntry = z.infer<typeof digestEntrySchema>;

/** What the synthesis model returns, before we ground and persist it. */
export const digestDraftSchema = z.object({
  /**
   * The lede. One or two sentences naming the single most consequential thing
   * that happened, so the page has one focal point.
   */
  summary: z
    .string()
    .min(80, "The lede needs to say something specific")
    .max(500, "The lede is one or two sentences"),
  entries: z.array(digestEntryDraftSchema).min(1).max(12),
});

export type DigestDraft = z.infer<typeof digestDraftSchema>;

export const digestSchema = z.object({
  /** Equal to `date`. Present so the object is self-describing once loaded. */
  id: dateKeySchema,
  /** The date the digest is *for* — its edition date. */
  date: dateKeySchema,
  /** When the pipeline actually finished producing it. Always surfaced in the UI. */
  generatedAt: isoDateTimeSchema,
  /** Inclusive lower bound of the window the research step was asked to cover. */
  coversFrom: dateKeySchema,
  /** Inclusive upper bound of that window. */
  coversTo: dateKeySchema,
  summary: z.string(),
  entries: z.array(digestEntrySchema),
  meta: z.object({
    trigger: z.enum(["scheduled", "manual"]),
    model: z.string(),
    /** Distinct source hostnames the research step actually retrieved. */
    sourcesConsulted: z.number().int().nonnegative(),
    /**
     * Entries the model produced that we dropped because their URL never
     * appeared in the retrieved search results. Surfaced in the UI footer:
     * a non-zero value here is a signal worth watching, not something to hide.
     */
    ungroundedEntriesDropped: z.number().int().nonnegative(),
  }),
});

export type Digest = z.infer<typeof digestSchema>;

/**
 * Every pipeline attempt is recorded, successful or not. The UI reads the most
 * recent record to decide whether it can present the stored digest as current.
 */
export const digestRunSchema = z.object({
  id: z.string().min(1),
  trigger: z.enum(["scheduled", "manual"]),
  startedAt: isoDateTimeSchema,
  finishedAt: isoDateTimeSchema,
  status: z.enum(["success", "failed"]),
  /** Set when the run produced a digest. */
  digestDate: dateKeySchema.optional(),
  /** Operator-facing failure reason. Never rendered to end users verbatim. */
  error: z.string().optional(),
  /** Non-fatal problems, e.g. a category that returned nothing. */
  warnings: z.array(z.string()).default([]),
});

export type DigestRun = z.infer<typeof digestRunSchema>;

export const digestSummarySchema = z.object({
  date: dateKeySchema,
  generatedAt: isoDateTimeSchema,
  summary: z.string(),
  entryCount: z.number().int().nonnegative(),
});

export type DigestSummary = z.infer<typeof digestSummarySchema>;
