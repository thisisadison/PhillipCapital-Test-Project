/**
 * Renders the Cowork skill's reference files from the app's own domain modules.
 *
 * The prototype and the skill are two delivery surfaces for the same domain
 * knowledge: a web app for the team, and a skill an auditor runs in Cowork
 * without a terminal. Hand-copying the risk dimensions and obligation themes
 * into markdown would guarantee the two drift, and a skill quietly asking about
 * a dimension the app no longer has is exactly the kind of rot nobody notices.
 *
 * So there is one source of truth and this generates the rest.
 * `skillReferences.test.ts` fails if the checked-in files fall behind.
 *
 *   npx tsx scripts/generateSkillReferences.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderSkillReferences } from "../src/server/domain/skillReferences";

const OUT_DIR = join(process.cwd(), ".claude/skills/aml-audit-programme/references");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const [name, body] of Object.entries(renderSkillReferences())) {
    await writeFile(join(OUT_DIR, name), body, "utf8");
    console.log(`wrote references/${name}`);
  }
}

void main();
