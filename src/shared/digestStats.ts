import { CATEGORIES, type CategoryId } from "@/server/domain/category";
import {
  IMPACT_LABELS,
  IMPACT_LEVELS,
  SOURCE_TYPES,
  SOURCE_TYPE_LABELS,
  type Digest,
  type DigestSummary,
  type ImpactLevel,
  type SourceType,
} from "@/server/domain/digest";

/**
 * Chart inputs, derived from a stored edition.
 *
 * Everything the visualisations show is counted from the entries actually on
 * the page — nothing is stored alongside the digest that could drift out of
 * agreement with it, and there is no number here a reader could not verify by
 * counting the cards themselves.
 */

export interface CategoryDatum {
  id: CategoryId;
  label: string;
  shortLabel: string;
  count: number;
  /** Categorical colour slot from the validated palette. */
  colorSlot: number;
}

export interface SourceTypeDatum {
  type: SourceType;
  label: string;
  count: number;
}

export interface ImpactDatum {
  level: ImpactLevel;
  label: string;
  count: number;
}

export interface DigestStats {
  total: number;
  byCategory: CategoryDatum[];
  bySourceType: SourceTypeDatum[];
  byImpact: ImpactDatum[];
  /** Items needing action now — the number the page leads with. */
  actNow: number;
  /** Share of entries from a regulator or professional body, 0-100. */
  primarySharePercent: number;
  /** Distinct publishers behind the entries. */
  distinctPublishers: number;
}

export function deriveStats(digest: Digest): DigestStats {
  const { entries } = digest;

  const byCategory: CategoryDatum[] = CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    shortLabel: category.shortLabel,
    colorSlot: category.colorSlot,
    count: entries.filter((entry) => entry.category === category.id).length,
  }));

  const bySourceType: SourceTypeDatum[] = SOURCE_TYPES.map((type) => ({
    type,
    label: SOURCE_TYPE_LABELS[type],
    count: entries.filter((entry) => entry.sourceType === type).length,
  })).filter((datum) => datum.count > 0);

  const byImpact: ImpactDatum[] = IMPACT_LEVELS.map((level) => ({
    level,
    label: IMPACT_LABELS[level],
    count: entries.filter((entry) => entry.impact === level).length,
  }));

  const primaryCount = entries.filter(
    (entry) => entry.sourceType === "regulator" || entry.sourceType === "profession",
  ).length;

  return {
    total: entries.length,
    byCategory,
    bySourceType,
    byImpact,
    actNow: entries.filter((entry) => entry.impact === "act-now").length,
    primarySharePercent: entries.length === 0 ? 0 : Math.round((primaryCount / entries.length) * 100),
    distinctPublishers: new Set(entries.map((entry) => entry.sourceName)).size,
  };
}

export interface TrendPoint {
  date: string;
  count: number;
}

/**
 * Entries per edition, oldest first, for the archive trend.
 *
 * Returns an empty array below two editions: a trend line through one point is
 * a decoration, not information.
 */
export function deriveTrend(summaries: DigestSummary[]): TrendPoint[] {
  if (summaries.length < 2) return [];

  return [...summaries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((summary) => ({ date: summary.date, count: summary.entryCount }));
}
