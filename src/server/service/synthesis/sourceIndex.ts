import { classifySource, isPrimarySource } from "../research/sourceCatalogue";
import type { RetrievedSource } from "../research/ResearchService";
import type { SourceType } from "@/server/domain/digest";

export interface IndexedSource extends RetrievedSource {
  /** Short handle the model cites, e.g. `S07`. */
  id: string;
  type: SourceType;
}

/**
 * The set of sources the synthesis step is allowed to cite, each behind a short id.
 *
 * The model returns an id, never a URL, and this resolves it back to the URL the
 * search tool actually returned. That makes a fabricated link structurally
 * impossible rather than something we detect afterwards: there is no field in
 * which the model could write a URL at all. Asking it to copy a long URL
 * character-for-character was the weaker design — it invited exactly the
 * mismatch that then cost us the entry.
 */
export class SourceIndex {
  private readonly byId = new Map<string, IndexedSource>();
  readonly sources: IndexedSource[];

  constructor(retrieved: RetrievedSource[]) {
    // De-duplicate by URL, then order primary sources first so the model reaches
    // for the regulator's own page ahead of a trade-press write-up of it.
    const unique = [...new Map(retrieved.map((source) => [source.url, source])).values()];
    unique.sort((a, b) => {
      const rank = Number(isPrimarySource(b.url)) - Number(isPrimarySource(a.url));
      return rank !== 0 ? rank : a.url.localeCompare(b.url);
    });

    this.sources = unique.map((source, index) => ({
      ...source,
      id: `S${String(index + 1).padStart(2, "0")}`,
      type: classifySource(source.url),
    }));

    for (const source of this.sources) this.byId.set(source.id, source);
  }

  get size(): number {
    return this.sources.length;
  }

  /** Tolerant of case and stray whitespace; returns null for anything unknown. */
  resolve(rawId: string): IndexedSource | null {
    return this.byId.get(rawId.trim().toUpperCase()) ?? null;
  }

  /** The catalogue as it appears in the synthesis prompt. */
  format(): string {
    if (this.sources.length === 0) return "_No sources were retrieved._";

    return this.sources
      .map((source) => {
        const age = source.pageAge ? ` · published ${source.pageAge} ago` : "";
        return `${source.id}  ${source.title}\n     ${source.url}${age}`;
      })
      .join("\n");
  }
}
