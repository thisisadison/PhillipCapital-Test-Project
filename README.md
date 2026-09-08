# Market & Tech Trends Digest

A weekly briefing for the PhillipCapital Internal Audit team: what changed in audit technology,
regulation, financial crime and operational resilience, and what the team should do about it.

A scheduled job researches the week, an editing pass turns the findings into a one-page digest, and
the site serves the stored result. The UI performs no research logic — it reads a `Digest` and
renders it.

Everything the tool touches is public market and industry information. There is no audit data in it.

---

## How it works

```
  Monday 06:00 SGT
        │
        ▼
  ┌────────────────┐  web search, restricted to    ┌──────────────────┐
  │    research    │─▶ an allowlist of primary  ──▶│ source catalogue │
  │ (5 in parallel)│   and established sources     │  S01, S02, S03…  │
  └────────┬───────┘                               └────────┬─────────┘
           │ prose findings per section                     │
           ▼                                                │
  ┌────────────────┐  structured output; the model          │
  │   synthesis    │─▶ cites a source *id*, never a URL     │
  └────────┬───────┘                                        │
           │ draft entries                                  │
           ▼                                                ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │  normalise: resolve ids to real URLs, coerce what can be fixed,  │
  │  reject individual entries that cannot be trusted                │
  └───────────────────────────┬─────────────────────────────────────┘
                              ▼
                   ┌──────────────────────┐
                   │ repository (per date)│──▶ the page just reads this
                   └──────────────────────┘
```

Three ideas carry most of the quality:

**Source policy is structural, not editorial.** Search is restricted to an allowlist of regulators,
standard setters, professional bodies, Big 4 insight pages, audit-technology vendors and established
trade press (`server/service/research/sourceCatalogue.ts`). A search-optimised article restating a
MAS circular can never enter the candidate set, so the synthesis step never has to be asked to prefer
the regulator over the aggregator. The same catalogue assigns each entry its publisher type, so the
source-mix chart is derived from data rather than from the model's opinion.

**The model cannot write a URL.** It picks from a numbered catalogue of pages the search actually
returned, and the link is filled in afterwards. A fabricated or mistyped link is not something that
gets caught — it is something that cannot be expressed.

**Partial failure is designed for.** A section that fails costs that section; an entry that cannot be
trusted costs that entry. The run fails only when there is genuinely nothing to publish.

> **A note on structured outputs.** The API does not enforce `enum`, `minLength`, `maxLength` or
> `pattern` — the SDK downgrades those keywords into schema *descriptions*, so they steer the model
> but are invisible to the validator. An earlier version of this pipeline put its editorial rules in
> the response schema and parsed strictly, which meant one capitalised category or one slightly short
> sentence destroyed the entire week's digest. The wire schema is now deliberately permissive
> (`synthesis/draftSchema.ts`) and every rule lives in `synthesis/normalise.ts`, which repairs what it
> can and rejects one entry at a time.

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

## Running it

```bash
npm install
cp .env.example .env.local     # set ANTHROPIC_API_KEY at minimum
npm run dev
```

With no digest stored, the site shows the empty state. To produce one:

```bash
npm run digest:generate        # a full run: a few minutes, real API spend
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
| `DIGEST_TIMEZONE` | no | Default `Asia/Singapore`. |
| `DIGEST_MANUAL_COOLDOWN_MINUTES` | no | Default 30. |
| `DIGEST_MANUAL_RUNS_PER_DAY` | no | Default 6. |

### Scheduling

Default cadence is **Monday 06:00 Asia/Singapore**. Both supplied schedules fire at Sunday 22:00 UTC,
which is the same moment.

- `vercel.json` — Vercel Cron calling `/api/cron`.
- `.github/workflows/weekly-digest.yml` — GitHub Actions calling the same route. Set the
  `DIGEST_URL` and `CRON_SECRET` repository secrets.
- Anything else that can issue an authenticated request on a timer, or run `npm run digest:generate`.

### Access

One shared code, exchanged at `/unlock` for an HMAC-signed httpOnly cookie that `src/proxy.ts`
checks. No accounts, no roles: this is public information for one internal team. Rotating
`DIGEST_ACCESS_CODE` invalidates every issued cookie. `/api/cron` sits outside the gate with its own
bearer secret, so the scheduler never needs the team's code.

## Layout

Layered, with the Next.js routes acting as thin controllers over a service layer:

```
src/
  app/                    routes — controllers only; no business logic
    api/{access,cron,regenerate}/
    archive/ · method/ · unlock/
  server/
    config/               runtime configuration
    domain/               the model: categories, Digest, DigestEntry, DigestRun
    repository/           DigestRepository interface + flat-file implementation
    security/             the shared-code access gate
    service/
      research/           stage 1 — search within the allowlist
      synthesis/          stage 2 — draft, source index, normalisation
      DigestService.ts    orchestration
      RateLimitService.ts manual-trigger limits
  shared/                 pure, safe on both sides: dates, stats, freshness
  ui/
    charts/               visualisations + the validated palette
    components/
```

The dependency direction is one-way: `app` → `ui`/`server`, `server/service` → `server/domain` and
`server/repository`. Nothing in `domain` imports a service.

### Storage

Flat JSON, one document per edition (`data/digests/YYYY-MM-DD.json`) plus a rolling run log, written
atomically via temp-file-and-rename and guarded by a file lock so a scheduled run and a manual one
cannot lose each other's records.

This suits a single long-lived instance with a persistent volume. It is **not** suitable for a
read-only or per-request filesystem such as stock serverless — point `DIGEST_DATA_DIR` at a mounted
volume, or write another `DigestRepository`. That interface is the only thing the rest of the code
knows about.

## Design

Card-based, CSS-variable theming with light and dark defined together, a serif display face against
a system sans body, monospace for dates and metadata.

Colour is reserved for data. The prose stays monochrome; hue appears in the charts, as the section
key on each card, and nowhere else. The categorical palette is fixed per section — a colour always
means the same thing and never shifts because a section was empty that week — and was validated
against this page's own surfaces in both themes (lightness band, chroma floor, colour-vision-
deficiency separation, normal-vision separation, contrast). Three light-mode slots sit below 3:1
against the surface, so every chart ships direct labels and a screen-reader table rather than relying
on colour alone.

Publisher marks try the publisher's own favicon over a generated monogram; the monogram renders
first and always, so a blocked network degrades to something designed rather than to an empty box.

Fonts are system stacks — no webfont fetch, no layout shift, no third-party request. Swapping in a
licensed face is a change to `--font-display` in `src/app/globals.css`.

Every text/background pair in both themes clears WCAG AA.
