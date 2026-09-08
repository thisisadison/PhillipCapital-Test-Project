import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  digestRunSchema,
  digestSchema,
  type Digest,
  type DigestRun,
  type DigestSummary,
} from "@/server/domain/digest";
import { withFileLock } from "./fileLock";
import type { DigestRepository } from "./DigestRepository";

const DATE_KEY_FILE = /^(\d{4}-\d{2}-\d{2})\.json$/;
/** Run records are diagnostics, not archive material. Keep a rolling window. */
const MAX_RUN_RECORDS = 60;

/**
 * Flat-file repository: one JSON document per edition plus a rolling run log.
 *
 * Suited to a single long-lived instance with a persistent volume (container,
 * VM, Node server). Not suitable for a read-only or per-request filesystem such
 * as stock serverless — point `DIGEST_DATA_DIR` at a mounted volume, or write
 * another `DigestRepository`.
 */
export class FileDigestRepository implements DigestRepository {
  private readonly digestDir: string;
  private readonly runsPath: string;
  private readonly lockPath: string;

  constructor(private readonly rootDir: string) {
    this.digestDir = join(rootDir, "digests");
    this.runsPath = join(rootDir, "runs.json");
    this.lockPath = join(rootDir, ".runs.lock");
  }

  async findLatest(): Promise<Digest | null> {
    const [latest] = await this.listDateKeys();
    return latest ? this.findByDate(latest) : null;
  }

  async findByDate(date: string): Promise<Digest | null> {
    // Refuse anything that is not a bare date key, so a caller can never
    // traverse out of the data directory.
    if (!DATE_KEY_FILE.test(`${date}.json`)) return null;

    const raw = await readJson(join(this.digestDir, `${date}.json`));
    if (raw === null) return null;

    const parsed = digestSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(`[repository] Digest ${date} failed validation; ignoring it.`, parsed.error.issues);
      return null;
    }
    return parsed.data;
  }

  async listSummaries(limit: number): Promise<DigestSummary[]> {
    const keys = (await this.listDateKeys()).slice(0, Math.max(0, limit));
    const digests = await Promise.all(keys.map((key) => this.findByDate(key)));

    return digests
      .filter((digest): digest is Digest => digest !== null)
      .map((digest) => ({
        date: digest.date,
        generatedAt: digest.generatedAt,
        summary: digest.summary,
        entryCount: digest.entries.length,
        countsByCategory: digest.entries.reduce<Record<string, number>>((counts, entry) => {
          counts[entry.category] = (counts[entry.category] ?? 0) + 1;
          return counts;
        }, {}),
      }));
  }

  async save(digest: Digest): Promise<void> {
    const validated = digestSchema.parse(digest);
    await mkdir(this.digestDir, { recursive: true });
    await writeJsonAtomic(join(this.digestDir, `${validated.date}.json`), validated);
  }

  async recordRun(run: DigestRun): Promise<void> {
    const validated = digestRunSchema.parse(run);
    await mkdir(this.rootDir, { recursive: true });

    await withFileLock(this.lockPath, async () => {
      const existing = await this.readRuns();
      await writeJsonAtomic(this.runsPath, [validated, ...existing].slice(0, MAX_RUN_RECORDS));
    });
  }

  async findLastRun(): Promise<DigestRun | null> {
    const [latest] = await this.listRuns(1);
    return latest ?? null;
  }

  async listRuns(limit: number): Promise<DigestRun[]> {
    return (await this.readRuns()).slice(0, Math.max(0, limit));
  }

  /** Date keys of stored editions, newest first. */
  private async listDateKeys(): Promise<string[]> {
    let names: string[];
    try {
      names = await readdir(this.digestDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }

    return names
      .map((name) => DATE_KEY_FILE.exec(name)?.[1])
      .filter((key): key is string => key !== undefined)
      .sort((a, b) => b.localeCompare(a));
  }

  private async readRuns(): Promise<DigestRun[]> {
    const raw = await readJson(this.runsPath);
    if (!Array.isArray(raw)) return [];

    // Drop individual malformed records rather than losing the whole log.
    return raw.flatMap((entry) => {
      const parsed = digestRunSchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    });
  }
}

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    if (error instanceof SyntaxError) {
      console.error(`[repository] ${path} is not valid JSON; treating it as absent.`);
      return null;
    }
    throw error;
  }
}

/**
 * Write to a sibling temp file then rename. A reader either sees the previous
 * document or the new one, never a half-written file.
 */
async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  const tempPath = `${path}.${randomUUID()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempPath, path);
}
