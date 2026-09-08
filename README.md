# Market & Tech Trends Digest

A weekly briefing for the PhillipCapital Internal Audit team on audit automation, AI in internal
audit, and the regulatory developments behind them.

A scheduled job researches the week, an editing pass turns the findings into a one-page digest, and
the site serves the stored result. The team opens one page and, within seconds, knows what changed
in their world last week.

Everything the tool touches is public market and industry information. There is no audit data in it.

---

## How it works

```
  Monday 06:00 SGT
        │
        ▼
  ┌───────────────┐   web search, restricted to    ┌──────────────┐
  │   research    │──▶ an allowlist of primary  ──▶│  candidate   │
  │  (3 parallel) │    and established sources     │   sources    │
  └───────────────┘                                └──────┬───────┘
        │ prose findings per category                     │
        ▼                                                 │
  ┌───────────────┐   structured output against            │
  │  synthesis    │──▶ the digest schema                   │
  └───────┬───────┘                                        │
          │ draft entries                                  │
          ▼                                                ▼
  ┌────────────────────────────────────────────────────────────┐
  │  grounding: drop any entry whose URL was never retrieved    │
  └───────────────────────────┬────────────────────────────────┘
                              ▼
                    ┌───────────────────┐
                    │  store (per date) │──▶  the page just reads this
                    └───────────────────┘
```

Three ideas carry most of the quality:

**Source policy is structural, not editorial.** Search is restricted to an allowlist of regulators,
standard setters, professional bodies, Big 4 insight pages and established trade press
(`src/lib/digest/sources.ts`). An SEO listicle restating a MAS circular can never enter the
candidate set, so the synthesis step never has to be asked to prefer the regulator over the
aggregator.

**Every link is grounded.** The synthesis model must copy source URLs verbatim from the retrieved
results, and `groundEntries` enforces it — an entry whose URL was not returned by the search step is
discarded, and the count of discarded entries is printed in the page footer. A digest is only as
trustworthy as its links.

**The schema does part of the editing.** A synthesis under 120 characters fails validation, which
makes "if it only restates the headline, cut it" a rule rather than a hope.

## Freshness and failure

The generation timestamp is on the page unconditionally, in every state. On top of that,
`deriveStatus` decides how the edition is presented:

| State | When | What the reader sees |
|---|---|---|
| `current` | Recent edition, last run succeeded | The digest, no banner |
| `refresh-failed` | A run failed *after* the edition was written | Red banner naming the failed attempt and the edition's real date |
| `stale` | Newest edition older than `STALE_AFTER_DAYS` (10) | Amber banner saying the scheduled job may not be running |
| `empty` | Nothing has ever been published | An explanation of what will appear and when — never a placeholder edition |

An edition is shown as current only when the most recent pipeline attempt actually produced it.
Stale content is never dressed up as fresh.

## Running it

```bash
npm install
cp .env.example .env.local     # set ANTHROPIC_API_KEY at minimum
npm run dev
```

With no digest stored, the site shows the empty state. To produce one:

```bash
npm run digest:generate        # a full run: ~2-4 minutes, real API spend
```

| Command | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | Unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run digest:generate` | Run the pipeline from the CLI (`--manual` to record it as a manual run) |

### Configuration

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Server-side only. Never referenced from a client component. |
| `CRON_SECRET` | for scheduling | Bearer secret for `POST /api/cron`. Without it that route returns 503 rather than exposing an unauthenticated trigger. |
| `DIGEST_ACCESS_CODE` | recommended | The shared access code. Unset means no gate — intended for local development. |
| `DIGEST_DATA_DIR` | no | Where digests and the run log are written. Default `./data`. |
| `DIGEST_TIMEZONE` | no | Default `Asia/Singapore`. Edition dates and timestamps are rendered in it. |
| `DIGEST_MANUAL_COOLDOWN_MINUTES` | no | Default 30. |
| `DIGEST_MANUAL_RUNS_PER_DAY` | no | Default 6. |

### Scheduling

Default cadence is **Monday 06:00 Asia/Singapore** — the digest is on screen before the week starts.
Both supplied schedules fire at Sunday 22:00 UTC, which is the same moment.

- `vercel.json` — Vercel Cron calling `/api/cron`.
- `.github/workflows/weekly-digest.yml` — GitHub Actions calling the same route. Set the
  `DIGEST_URL` and `CRON_SECRET` repository secrets.
- Anything else that can issue an authenticated request on a timer, or run
  `npm run digest:generate` directly.

### Access

One shared code, exchanged at `/unlock` for an HMAC-signed httpOnly cookie that `src/proxy.ts`
checks. There are no accounts and no roles: this is public information for one internal team, and
anything heavier would be surface area for no benefit. Rotating `DIGEST_ACCESS_CODE` invalidates
every issued cookie.

`/api/cron` sits outside the gate and authenticates with its own bearer secret, so the scheduler
never needs the team's code.

## Layout

```
src/
  lib/
    digest/
      categories.ts   the three sections, and the brief that steers research for each
      sources.ts      the domain allowlist — the main source-quality lever
      research.ts     stage 1: search within the allowlist, return findings + retrieved URLs
      synthesize.ts   stage 2: edit the findings into the digest schema
      grounding.ts    discard entries whose URL was never retrieved; dedupe
      pipeline.ts     orchestration, and the run record written on every attempt
      status.ts       how an edition should be presented (pure)
      schema.ts       the digest contract, shared by pipeline, store and UI
    store/            DigestStore interface + flat-file implementation
    rateLimit.ts      manual-trigger limits, derived from the persisted run log (pure)
    access/           the shared-code gate
  app/                routes; the UI only ever reads structured digest data
  components/
```

The UI performs no research logic. It reads a `Digest` and renders it.

### Storage

Flat JSON, one document per edition (`data/digests/YYYY-MM-DD.json`) plus a rolling run log, written
atomically via temp-file-and-rename and guarded by a file lock so a scheduled run and a manual one
cannot lose each other's records.

This suits a single long-lived instance with a persistent volume. It is **not** suitable for a
read-only or per-request filesystem such as stock serverless — point `DIGEST_DATA_DIR` at a mounted
volume, or implement `DigestStore` against a database. That interface is the only thing the rest of
the code knows about.

## Design

Card-based, CSS-variable theming with light and dark defined together, a serif display face against
a system sans body with monospace reserved for dates and metadata. Colour carries no decoration: the
page is ink on paper, and hue appears only where it means something — a failed run, a focus ring.

Fonts are system stacks, so there is no webfont fetch, no layout shift and no third-party request.
Swapping in a licensed face is a change to `--font-display` in `src/app/globals.css`.

Every text/background pair in both themes clears WCAG AA (4.5:1).
