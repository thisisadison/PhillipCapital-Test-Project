import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  auditProgrammeSchema,
  totalSteps,
  type AuditProgramme,
  type ProgrammeSummary,
} from "@/server/domain/programme";
import type { ProgrammeRepository } from "./ProgrammeRepository";

/** `YYYY-MM-DD-xxxxxx` — sortable by date, unique within a day. */
const PROGRAMME_ID = /^(\d{4}-\d{2}-\d{2}-[a-f0-9]{6})\.json$/;

/**
 * Flat-file programme store, mirroring `FileDigestRepository`: one JSON
 * document per programme, written atomically via temp-file-and-rename.
 */
export class FileProgrammeRepository implements ProgrammeRepository {
  private readonly dir: string;

  constructor(rootDir: string) {
    this.dir = join(rootDir, "programmes");
  }

  async findById(id: string): Promise<AuditProgramme | null> {
    // Refuse anything that is not a bare id, so a caller can never traverse out
    // of the data directory.
    if (!PROGRAMME_ID.test(`${id}.json`)) return null;

    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(join(this.dir, `${id}.json`), "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      if (error instanceof SyntaxError) {
        console.error(`[repository] Programme ${id} is not valid JSON; treating it as absent.`);
        return null;
      }
      throw error;
    }

    const parsed = auditProgrammeSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(`[repository] Programme ${id} failed validation; ignoring it.`, parsed.error.issues);
      return null;
    }
    return parsed.data;
  }

  async findLatest(): Promise<AuditProgramme | null> {
    const [latest] = await this.listIds();
    return latest ? this.findById(latest) : null;
  }

  async listSummaries(limit: number): Promise<ProgrammeSummary[]> {
    const ids = (await this.listIds()).slice(0, Math.max(0, limit));
    const programmes = await Promise.all(ids.map((id) => this.findById(id)));

    return programmes
      .filter((programme): programme is AuditProgramme => programme !== null)
      .map((programme) => ({
        id: programme.id,
        domain: programme.domain,
        title: programme.title,
        status: programme.status,
        createdAt: programme.createdAt,
        areaCount: programme.scopeAreas.length,
        stepCount: totalSteps(programme),
      }));
  }

  async save(programme: AuditProgramme): Promise<void> {
    const validated = auditProgrammeSchema.parse(programme);
    await mkdir(this.dir, { recursive: true });

    const path = join(this.dir, `${validated.id}.json`);
    const tempPath = `${path}.${randomUUID()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
    await rename(tempPath, path);
  }

  /** Programme ids, newest first. */
  private async listIds(): Promise<string[]> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }

    return names
      .map((name) => PROGRAMME_ID.exec(name)?.[1])
      .filter((id): id is string => id !== undefined)
      .sort((a, b) => b.localeCompare(a));
  }
}
