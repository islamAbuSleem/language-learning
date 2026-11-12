# Design — the A1 to B2 path

Our own syllabus for the Spanish track, organised on the CEFR scale
(Common European Framework of Reference). Content is data: the ladder in
`content/es/track.json` is the source of truth, and this document is the plan
behind it.

Levels are a property of the **track**, not of the learner. One learner walks
A1 → A2 → B1 → B2; the app does not need an account to know where someone is,
it reads their item states.

## Shape

| Level | Label | Grammar introduced | Units planned |
| --- | --- | --- | --- |
| **A1** | Beginner | ser and estar · present tense · gender and articles · question words · numbers 0–100 | 6 |
| **A2** | Elementary | preterite and imperfect · reflexive verbs · demonstratives · por and para · expressing plans | 8 |
| **B1** | Intermediate | present perfect · subjunctive after cuando and although · relative clauses · indirect speech · the conditional | 10 |
| **B2** | Upper intermediate | subjunctive against the indicative · pluperfect · reported speech · concessive clauses · formal register | 12 |

Written so far: **A1 units 1–2**. Everything else is planned, not authored.

## A1 — Beginner

> Order, greet, and describe what you see.

| Unit | Theme | Grammar | Exercises |
| --- | --- | --- | --- |
| 1 | At the café | gender and articles | select ×4, match ×2, type_in ×2, listen ×2 |
| 2 | Getting around | question words | select ×4, match ×2, type_in ×2, listen ×2 |
| 3 | Introductions | ser and estar | |
| 4 | At home | demonstratives | |
| 5 | Daily routine | present tense, reflexive verbs | |
| 6 | Food and shopping | numbers, por and para | |

**Exit criteria** — a learner has finished A1 when they can order, ask for
directions, introduce themselves and describe their routine, in short exchanges.

## A2 — Elementary

> Talk about routines, plans, and what happened yesterday.

| Unit | Theme | Grammar |
| --- | --- | --- |
| 7 | Past and future | preterite and imperfect |
| 8 | Family and friends | possessive adjectives |
| 9 | A day out | expressing plans |
| 10 | The city | por and para |
| 11 | Health and body | reflexive verbs |
| 12 | Work and study | preterite with irregular verbs |
| 13 | Travel | demonstratives and comparison |
| 14 | Review | mixed |

## B1 — Intermediate

> Hold a conversation about familiar topics and tell a story.

| Unit | Theme | Grammar |
| --- | --- | --- |
| 15 | Experiences | present perfect |
| 16 | Hopes and doubts | subjunctive after cuando and although |
| 17 | Who is who | relative clauses |
| 18 | Reporting | indirect speech |
| 19 | If this happens | the conditional |
| 20–24 | Thematic units | mixed, one grammar point each |

## B2 — Upper intermediate

> Argue a position, explain a process, and follow the news.

| Unit | Theme | Grammar |
| --- | --- | --- |
| 25 | Opinions | subjunctive against the indicative |
| 26 | Looking back | pluperfect |
| 27 | The news | reported speech |
| 28 | Concessions | concessive clauses |
| 29 | Writing formally | formal register |
| 30–36 | Thematic units | mixed, one grammar point each |

## Rules for writing a unit

1. **Ten exercises.** The unit size comes from the reference app: a unit is a
   short, finishable session (`0 / 10` on the progress bar).
2. **A unit teaches one thing.** One grammar point, one theme. A unit that
   mixes three grammar points teaches none of them.
3. **Four shapes, rotating.** `select`, `match`, `type_in`, `listen` — a
   learner should not meet the same shape three times in a row.
4. **Every exercise carries its own note.** A short grammar or usage note, in
   our words. The feedback panel shows it after the answer.
5. **New vocabulary is introduced by the unit, not the app.** Ten words, ten
   exercises, each word met once.
6. **The level directory is the level.** `content/es/A1/unit-1.json` must carry
   `"level": "A1"`. A test enforces it.

## Content gap

36 units × 10 exercises = **360 exercises** for the Spanish track alone, each
with a prompt, an answer and a note. That is the real remaining cost of this
app, and it is writing work, not code work. The schema, the loader, the API
and the path UI already handle all four levels.

`listen` also needs audio. The schema and the renderer exist; the assets do
not. TTS generation or recorded audio is a separate decision.
