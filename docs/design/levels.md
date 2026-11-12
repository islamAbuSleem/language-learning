# Design — the A1 to B2 path

Our own syllabus for the Spanish track, organised on the CEFR scale
(Common European Framework of Reference). Content is data: the ladder in
`content/es/track.json` is the source of truth, and this document is the plan
behind it.

Levels are a property of the **track**, not of the learner. One learner walks
A1 → A2 → B1 → B2; the app does not need an account to know where someone is,
it reads their item states.

## Where the grammar progression comes from

The **order** of the grammar points follows the sequence in a published
beginner course outline — articles, then *ser*, then the regular present
tense, then *estar*, then the irregulars, and on through the preterite. A
syllabus of grammar points is a functional outline, and it is a well-tested
one.

Everything else here is ours: every word, translation, note, example and
exercise. No lesson text, exercise or glossary is taken from any published
book. Where a book is worth reading, it is on the reading list, not in the
content.

## Shape

| Level | Label | Grammar introduced | Units |
| --- | --- | --- | --- |
| **A1** | Beginner | articles and nouns · subject pronouns and *ser* · regular *-ar* verbs · numbers · *estar* | 6 |
| **A2** | Elementary | *-er* and *-ir* verbs · the verb *ir* · telling the time · *tener* · question words · *saber* and *conocer* | 8 |
| **B1** | Intermediate | stem-changing verbs · the irregular present · the present progressive · direct object pronouns · reflexives · the preterite · commands and comparisons | 10 |
| **B2** | Upper intermediate | the subjunctive · *desde cuándo* · reported speech · the conditional · the pluperfect · concessive clauses · formal register | 12 |

## A1 — Beginner

> Order, greet, and describe what you see.

| Unit | Theme | Grammar | Words | Written |
| --- | --- | --- | --- | --- |
| 1 | At the café | gender and articles | 10 | yes |
| 2 | Getting around | nouns and their articles | 10 | yes |
| 3 | Who are you | subject pronouns and *ser* | 10 | yes |
| 4 | Daily routine | regular *-ar* verbs | 10 | yes |
| 5 | Numbers | indefinite articles and numbers to 100 | 10 | yes |
| 6 | Where things are | the verb *estar* | 10 | yes |

**Exit criteria** — a learner has finished A1 when they can order, ask for
directions, introduce themselves and describe their routine, in short exchanges.

## A2 — Elementary

> Talk about routines, plans, and what happened yesterday.

| Unit | Theme | Grammar | Words | Written |
| --- | --- | --- | --- | --- |
| 7 | Things you do | regular *-er* verbs | 10 | yes |
| 8 | Writing and asking | regular *-ir* verbs | 10 | yes |
| 9 | Going somewhere | the verb *ir* | 10 | yes |
| 10 | The day | telling the time | 10 | yes |
| 11 | Having and needing | *tener* and its expressions | 10 | yes |
| 12 | Asking | question words and *hacer* | 10 | yes |
| 13 | Knowing | *saber* and *conocer* | 10 | yes |
| 14 | Review | mixed, travel theme | 10 | yes |

## B1 — Intermediate

> Hold a conversation about familiar topics and tell a story.

| Unit | Theme | Grammar |
| --- | --- | --- |
| 15 | Changing verbs | stem-changing verbs |
| 16 | The irregular ones | *ir*, *dar* and the other irregular presents |
| 17 | Right now | the present progressive |
| 18 | Him, her, them | direct object pronouns |
| 19 | Yes and no | affirmatives, negatives, demonstratives |
| 20 | Myself | reflexive verbs |
| 21 | Just now | *acabar de* and *hace* |
| 22 | Yesterday | the preterite with *-ar* verbs |
| 23 | Yesterday, again | the preterite with *-er* and *-ir* verbs |
| 24 | Orders and comparisons | formal commands, superlatives |

## B2 — Upper intermediate

> Argue a position, explain a process, and follow the news.

| Unit | Theme | Grammar |
| --- | --- | --- |
| 25 | Since when | *desde cuándo* |
| 26 | Doubts | the subjunctive |
| 27 | What they said | reported speech |
| 28 | If it happens | the conditional |
| 29 | Before that | the pluperfect |
| 30 | Although | concessive clauses |
| 31 | Writing to institutions | formal register |
| 32–36 | Thematic units | mixed, one grammar point each |

## Rules for writing a unit

1. **Ten words.** The unit size comes from the reference app: a unit is a
   short, finishable session (`0 / 10` on the progress bar).
2. **A unit teaches one thing.** One grammar point, one theme. A unit that
   mixes three grammar points teaches none of them.
3. **The words are the content.** The exercises are generated from them by
   `scripts/build-content.mjs`; nobody writes an exercise by hand.
4. **Every word carries a note.** A short grammar or usage note, in our words.
   The feedback panel shows it after the answer.
5. **A wrong answer is a word the learner has already met.** The generator
   enforces it, and a test checks it: a wrong answer the learner has never
   seen is a new word wearing a disguise.
6. **Four shapes, rotating.** `select`, `match`, `type_in`, `listen` — a
   learner should not meet the same shape three times in a row.

## Content gap

36 units × 10 words = **360 words** for the Spanish track alone. At ten words
a unit, that is thirty-six small vocabulary files rather than thirty-six large
exercise files — the generator does the rest.

`listen` needs audio. The schema, the renderer and the browser's own voice are
in place; recorded audio would replace the voice and change nothing else.
