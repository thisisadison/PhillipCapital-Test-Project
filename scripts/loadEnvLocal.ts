/**
 * Loads `.env.local` (falling back to `.env`) into `process.env` for standalone
 * scripts run outside Next.js.
 *
 * Next.js's own commands (`next dev`/`build`/`start`) load `.env.local`
 * automatically, but a plain script run via `tsx` gets no such help — nothing
 * reads the file unless something here does it. Import this module first, for
 * its side effect only, before anything that reads `process.env` at load time
 * (several `server/config` values are read at module scope, so this has to run
 * before that module is ever imported).
 *
 * A real shell-exported variable always wins over the file, matching the
 * precedence Next.js and `dotenv` both use.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const filename of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) continue;

  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
  break; // .env.local found and loaded; don't also load .env over it.
}
