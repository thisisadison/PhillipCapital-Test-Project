import { z } from "zod";

/**
 * The wire schema — what we accept back from the model.
 *
 * Deliberately permissive: plain strings, no enums, no length bounds. The API
 * does not enforce `enum`, `minLength`, `maxLength` or `pattern` — the SDK
 * downgrades those keywords into schema descriptions, so they are advisory to
 * the model and invisible to the validator. Encoding editorial rules here meant
 * a capitalised category or a slightly short sentence failed the parse and
 * destroyed the entire week's digest.
 *
 * Every rule that used to live here now lives in `normaliseDraft`, which
 * coerces what it can and rejects one entry at a time. This schema's only job
 * is to confirm the response has the right shape.
 */
export const draftEntrySchema = z.object({
  /** Handle from the source catalogue, e.g. `S07`. Resolved server-side. */
  sourceId: z.string(),
  category: z.string(),
  headline: z.string(),
  synthesis: z.string(),
  actionRequired: z.string(),
  impact: z.string(),
  affects: z.array(z.string()),
  publishedAt: z.string().optional(),
});

export type DraftEntry = z.infer<typeof draftEntrySchema>;

export const draftSchema = z.object({
  summary: z.string(),
  entries: z.array(draftEntrySchema),
});

export type Draft = z.infer<typeof draftSchema>;
