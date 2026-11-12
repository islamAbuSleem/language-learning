# Language App

Our own language-learning app. We studied how the reference app's method works —
the gamified loop, spaced repetition, streaks, leagues, hearts, XP — and
re-implement the *mechanics* with our own content and no paywall.

- **Design:** [`docs/design/lesson-engine.md`](docs/design/lesson-engine.md)
- **Observations of the reference app:** [`docs/rea/findings-ledger.md`](docs/rea/findings-ledger.md)
  (every finding cites a REA evidence id)
- **Working rules:** [`AGENTS.md`](AGENTS.md)

## Track priority

1. **Spanish** (from English) — in progress
2. German (from English)
3. English

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
```

Verify a change:

```bash
npm run build && npm test
```

Boot check: `node .output/server/index.mjs`, then `GET /api/health` → `{"status":"ok"}`.

## How it fits together

```
shared/content/schema.ts   exercise + unit schema (zod), one union, three tracks
shared/srs/types.ts        outcomes and self-grades, shared by app and server

server/domain/srs/         the SRS engine: mastery, schedule, selection, economy
                           pure TypeScript, no Nuxt, no browser, fully unit tested
server/domain/exercise/    grading (accent/case insensitive) and the client view
server/services/           content, learner state, lesson sessions
server/api/                tracks · units · progress · session · answer · complete

content/es/unit-N.json     exercise content, validated at build time
app/components/exercises/  one component per exercise type + a renderer registry
app/components/lesson/     the feedback panel
app/pages/                 dashboard · lesson/[unit]
```

### The two rules that matter

1. **The server owns the answer key.** The client never receives `answer`,
   `translation` or `note` before the learner answers. Grading happens in
   `server/domain/exercise/grading.ts`, which folds accents, case and punctuation
   so `Café.` is accepted for `el café`.
2. **The learner grades the item, not just the answer.** Every item ends with
   *Too easy* / *Too difficult*. That self-grade is the signal the SRS engine
   learns from; correctness is only the second signal.

## Screens

| | |
| --- | --- |
| ![dashboard](docs/screenshots/01-dashboard.png) | ![feedback](docs/screenshots/02-first-answer-feedback.png) |
| ![match](docs/screenshots/03-match-feedback.png) | ![complete](docs/screenshots/05-unit-complete.png) |

## Current state

Working: dashboard, lesson player (select / match / type_in), server-side
grading, the self-grade feedback panel, the SRS engine, XP, hearts, streak.

Not built yet: persistence (state is in memory), the practice node that brings
due items back, unit unlocking, audio for the `listen` type, German and English
content.
