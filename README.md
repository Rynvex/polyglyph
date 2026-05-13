# Polyglyph

> Offline-friendly, zero-LLM, multilingual typing-dialogue game.
> Practice real conversations across 7 languages by typing scripted replies.

Polyglyph blends **Glyphica-style typing** with **Duolingo-style scripted dialogues**. The player and an AI bot take turns; when it's your turn the screen shows a pre-written response template and you have to **type the whole thing correctly** before it sends. No LLM in the hot path, no latency, fully offline-capable.

## Why this works

- **Fixed scripts** → fully offline, zero LLM cost, zero latency
- **Response templates** → solves "I don't know what to say" — the biggest beginner blocker
- **Typing as core mechanic** → drills spelling, sentence patterns, and muscle memory in one loop

## Languages supported

| Language | CEFR span | Input method |
|---|---|---|
| English (en) | A1 → B2 | direct |
| Italian (it) / German (de) / Spanish (es) | A1 → B2 | direct (forgiving diacritics) |
| Japanese (ja) | A1 → B2 | romaji → kana (Kunrei + Hepburn accepted) |
| Korean (ko) | A1 → B2 | Revised Romanization → 한글 |
| Traditional Chinese (zh-tw) | A1 → B2 | direct |

Curated dialogues currently shipped: **10 across A1–B2** covering daily / food / travel / services / work / tech. Players can also author their own from the **Create** page (stored in `localStorage`).

## Quick start

```bash
pnpm install
pnpm dev                  # http://localhost:3014

# Tests + coverage
pnpm test                 # full vitest suite (~1100+ tests)
pnpm test:cov             # with coverage report (80% gate)

# Validate dialogue JSON
pnpm validate-scripts

# Production build
pnpm build && pnpm start
```

> If `pnpm dev` hits OS inotify limits in a container, fall back to `pnpm build && pnpm start` — same behavior.

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript strict
- **UI:** Tailwind v4
- **Schema:** zod
- **Tests:** vitest + jsdom + @testing-library/react, 80% coverage gate
- **Package manager:** pnpm

## Architecture (hard rules)

```
polyglyph/
├── app/                    Next.js App Router (UI pages)
├── components/             React components (Client/Server boundaries explicit)
│   └── DialogueScene.tsx   "use client" — sole keydown owner
├── lib/                    Pure TS — no React, no next/*, no browser APIs
│   ├── typing/             Typing engine + IME adapters per language
│   ├── data/               zod schemas + JSON loaders
│   └── dialogue/           Pure dialogue traversal
├── public/dialogues/       Dialogue JSON (blueprints + 7 translations each)
└── tests/unit/             vitest + RTL component tests
```

See [CLAUDE.md](CLAUDE.md) and [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) for the full architectural rules and design rationale.

## Dialogue JSON format

Each dialogue is **1 blueprint + 7 translations** (one per supported language):

```
public/dialogues/
├── blueprints/<id>.json
└── translations/<id>/{en,zh-tw,ja,ko,es,it,de}.json
```

Schema lives in `lib/data/dialogues/schema.ts` (zod) and is enforced by `pnpm validate-scripts`. Authoring conventions per language (especially the kana / romaji rules for ja and the Revised Romanization rules for ko) live in [docs/authoring/RULES.md](docs/authoring/RULES.md).

## Authoring pipeline (optional)

New dialogues can be drafted in a staging directory and promoted into `public/dialogues/` once they pass validation. The pipeline is **opt-in** — you can also write JSON directly into `public/dialogues/` and skip the staging dance.

```bash
# Configure staging directory (default: ./staging)
export POLYGLYPH_STAGING=/path/to/your/staging

# Validate + copy from staging into public/dialogues/
pnpm promote-generated --dry-run     # vet only
pnpm promote-generated --archive     # vet + copy + archive promoted entries
```

See [docs/authoring/SETUP.md](docs/authoring/SETUP.md) and [docs/automation/CRON_SETUP.md](docs/automation/CRON_SETUP.md) for cron-based automation.

## Documentation index

| File | What it is |
|---|---|
| [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) | Main design doc — architecture, JSON schema, roadmap, multilingual strategy |
| [CLAUDE.md](CLAUDE.md) | Project rules for Claude Code sessions + authoring pipeline overview |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Snapshot of current state + completed milestones |
| [docs/OPEN_ISSUES.md](docs/OPEN_ISSUES.md) | Backlog + sprint plan |
| [docs/authoring/RULES.md](docs/authoring/RULES.md) | Per-language IME conventions for dialogue authors |

## Contributing

Issues, PRs, and dialogue contributions welcome. Please:
1. Run `pnpm test` and `pnpm validate-scripts` before opening a PR.
2. For new dialogues, follow the schema rules in [docs/authoring/RULES.md](docs/authoring/RULES.md) and ensure `validate-scripts` is green.
3. Code style: TS strict, immutable updates, no `React` / `next/*` imports inside `lib/`.

## License

[MIT](LICENSE) © Rynvex
