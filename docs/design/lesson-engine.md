# Design — Lesson engine v0

Our own design, derived from REA observations of the reference app
(`docs/rea/findings-ledger.md`). Every reference-derived statement cites an evidence id.

Labels used below:

- **observed** — the reference app does this; we adopt it
- **decision** — our choice; the reference may do otherwise
- **open** — not established; we decide when we build it

## 1. Session shape

| Concept | Behaviour | Status |
| --- | --- | --- |
| Unit | 10 exercises. Unit progress bar reads `0 / 10` | observed `ev_485eac0f09a203be…` |
| Lesson | A run of exercises inside a unit. A unit holds **3 lessons** | observed `ev_485eac0f09a203be…` |
| Unit node kinds | **Lesson** (new material) · **Practice** (weakest skills) · **Unit Review** (mixed check) · **Radio** (narrative/listening) · **Chest** (reward) | observed `ev_d2e938f4255f1326…` |
| Unit test | A distinct state on the path, offered between units | observed `ev_d2e938f4255f1326…` |
| Placement | Before a section, offer "Pass this test to jump ahead to Unit 2!" → *Maybe later* / *Let's go* | observed `ev_bd07277f102d0e9f…` |
| Self-assessment | Before the first course, ask proficiency: "I'm new to X", "I know some common words", … then either placement test or start from the basics | observed `ev_485eac0f09a203be…` |

**Decision** — same skeleton for all three tracks. A track is data (units → lessons →
exercises), not code. One engine, three content sets.

## 2. Exercise types

| Type | Learner action | Observed in reference |
| --- | --- | --- |
| `select` | Pick one of N options. 3 options in the observed case; each option label carries a keyboard-shortcut suffix (`gato 3` = press 3) | observed `ev_320cf0f5ac7cef14…` |
| `match` | Pair two columns. 5 pairs in the observed case; keyboard shortcuts run `1-5` on the left column, `6-0` on the right | observed `ev_320cf0f5ac7cef14…` |
| `assist` | "Select the correct meaning" of a highlighted word | observed `ev_320cf0f5ac7cef14…` |
| `type-in` | Type the translation | **decision** — not yet observed in the reference |
| `listen` | Hear audio, then pick or type | **decision** — not yet observed |
| `speak` | Say the phrase out loud | **decision** — not yet observed |
| `arrange` | Drag words into sentence order | **decision** — not yet observed |

**Decision** — we ship `select`, `match`, `type-in` and `listen` in v0. `speak` and
`arrange` are v1+.

Component naming follows the reference's test-hook convention
(`challenge challenge-<type>`, `player-skip`, `player-next`, `quit-button`) so the
vocabulary is familiar — but the code is ours.

## 3. The exercise loop

Observed sequence:

1. **Prompt** — progress bar, hearts counter, item badge (*New word* / *Review*), question, answer area
2. **Answer** → *Check* becomes enabled (disabled until an answer exists)
3. **Feedback** — `Correct solution: <answer>`, then four actions: **Too easy**, **Too difficult**, **Report**, **Continue**
4. **Continue** → next exercise

observed `ev_1dfc24e4c77c5e8f…`, `ev_2a9ec70af799e30d…`, `ev_320cf0f5ac7cef14…`

**Decision** — our feedback panel:

- Shows the correct answer with a short "why" (our own grammar note).
- **Too easy** / **Too difficult** stay — this is the most valuable mechanic we found.
- **Report** — optional; we skip it in v0 (it needs moderation).
- *Continue* is the only required action; the self-grade is optional and defaults to
  neutral if the learner ignores it.

**Decision** — *Skip* is free in our app too, and it reveals the answer plus the
feedback panel (observed: hearts unchanged across 10+ skips). Skipped items go back into
the practice pool.

**Built** — the practice node. The dashboard shows how many items are due back and how
many are still shaky; `POST /api/practice` builds a session from the learner's own
items, either the ones the schedule says are due (`due`) or the ones below the mastery
ceiling (`weak`). Exercises are found back from their ids, so the session comes from the
learner's history and not from the unit. Verified against the database: an item
answered wrongly sits at mastery 0 and comes back at once, an item answered correctly
sits at 0.30 and is due tomorrow.

## 4. The SRS model

The reference asks the learner to self-grade every item (**Too easy** / **Too difficult**).
That is a strong signal and it is cheap. We adopt it.

**Decision** — per-item state:

```text
ItemState {
  itemId
  mastery: number      // 0..1
  reps: number
  lapses: number
  lastReviewedAt: timestamp
  dueAt: timestamp
  stability: number    // days
}
```

Update rule, applied once per completed exercise:

| Outcome | Mastery delta |
| --- | --- |
| Correct + *Too easy* | `+0.30` |
| Correct (no self-grade) | `+0.12` |
| Correct + *Too difficult* | `+0.02` |
| Incorrect | `−0.35` |
| Incorrect + *Too difficult* | `−0.45` |
| Skipped | `0` (but `dueAt` set to now, so it returns immediately) |

Mastery clamps to `[0, 1]`.

Scheduling — decision:

```text
nextIntervalDays =
    mastery < 0.2  ? 0                       // same session
  : mastery < 0.4  ? 1
  : mastery < 0.6  ? 2
  : mastery < 0.8  ? 4
  : mastery < 0.95 ? 8
  :                    max(14, stability * 2.5)
```

**Practice** node draws from items with `mastery < 0.6`, oldest `dueAt` first.
**Unit Review** draws from the unit's items regardless of mastery, mixing `select`,
`match` and `type-in`. The unit itself is described below.

**open** — the reference's actual scheduling formula is not established. Ours is a
defensible spaced-repetition approximation, not a copy.

### The unit state

The unit is the thing the learner actually sees, so it gets a state of its own.
It is derived from the item states and never stored separately, so it cannot
drift away from them.

```text
UnitProgress {
  level, unit
  status: "locked" | "current" | "done" | "weak"
  total: number           // exercises in the unit
  answered: number        // exercises the learner has been shown
  completed: boolean      // every exercise seen
  accuracy: number | null // right answers over answers
  shaky: number           // words still below the practice ceiling
  due: number             // of those, how many are due back now
}
```

**Decision** — the four rules:

1. **Finished means every exercise has been seen.** A skip counts as seen: a
   skip is free, it shows the solution, and it must not hold the path open.
   (Before this, a skipped exercise did not count, so a learner who skipped
   one could never finish the unit and the next one never opened. The journey
   check covers it now.)
2. **Accuracy is right answers over answers**, over every attempt at the
   unit's exercises, so practice rounds count towards it too.
3. **Weak** means finished, and accuracy below `0.8`: eight right in ten. One
   wrong answer in a unit of ten does not stop anybody moving on — it only
   means the unit is worth another look.
4. **Locked** means the unit before it is not finished. The path has no gaps.

**Decision** — the revisit path. A finished unit can always be started again,
because being finished and being learned are not the same thing. The
dashboard lists the weak units under *Worth another look*, worst first, with
the score the learner got, and the lesson page says why they are back: "You
answered 60% of this unit last time. Do it again and see if it sticks."
Nothing blocks and nothing nags: the learner decides when to go over a unit
again.

## 5. Economy

| Thing | Value | Status |
| --- | --- | --- |
| Hearts | **None.** There is no heart counter and no block: a wrong answer costs mastery, nothing else | decision |
| XP per lesson | **+10** (the node popover reads "Start +10 XP") | observed `ev_485eac0f09a203be…` |
| XP tiers | — | **open** |
| Lingots (currency) | 1000 observed on the account | observed `ev_0e43b4e92cc16880…` |
| Streak | consecutive days | **open** |
| League | weekly tier, entry tier **Bronze**; a lesson is needed to join | observed `ev_0e43b4e92cc16880…` |
| Daily quests | present on the dashboard | observed `ev_0e43b4e92cc16880…` |
| Guidebook | per-unit tips, `/guidebook/<target>/<unit>` | observed `ev_44e78786d6d6990…` |

**Decision** — we ship the economy **without the paywall**. That is the whole point of
this app: everything above is free, always.

**Decision** — no hearts at all. The reference blocks a learner out of a lesson when
the hearts run out; we do not. A wrong answer costs the item's mastery and nothing
else, so the learner is never kept out of the content and never waits for a refill.
The only pressure is the SRS: the item comes back sooner.

**Decision** — v0 economy: xp = 2 per exercise (about 20 per lesson), a streak that
counts consecutive days, and no lingots and no shop — those exist only to sell, and
we are not selling.

**Decision** — progress lives in Postgres (Neon). The SRS engine stays pure and
framework-free; `server/domain/progress/repository.ts` is the only seam, so the
store can be swapped without touching the scheduling logic.

## 6. Dashboard

Observed layout, in order (`ev_0e43b4e92cc16880…`, `ev_485eac0f09a203be…`):

- Nav: Learn · Leaderboards · Quests · Shop · Profile · More
- Three stat chips: **streak**, **lingots**, **hearts**
- **League** panel (Bronze, "View League" → `/leaderboard`)
- **Daily Quests** panel
- Skill path: sections → units → nodes, each unit titled and with a Guidebook link
- "Jump here?" placement prompt when a section boundary is reachable

**Decision** — our v0 dashboard: nav (Learn · Progress · Profile), streak + hearts chips,
a "today" panel (daily goal + streak), and the skill path. No leaderboard, no shop, no
quests in v0 — they are social features that need other humans. Add them when the
content engine is solid.

## 7. i18n

Observed: the reference has **no** interface-language setting. The UI language is a
property of the course's source language, and the catalogue is filtered by "I speak
<language>" (`ev_879873ce9379cb27…`, `ev_424a1155d063872f…`, `ev_614cda278ce14ee4…`).

**Decision** — we do the opposite, because our audience is explicit: a single account can
study Spanish, German and English, and the interface language is a user preference that
is independent of the course. One UI language (English) for v0; the *course* is a
(content, source-language) pair.

## 8. Open questions to close next

- [ ] Confirm the remaining exercise types (`type-in`, `listen`) against the reference —
      the reference's onboarding overlay kept blocking the path to a lesson that uses them
- [ ] XP tiers and how they gate content
- [ ] Streak freeze semantics
- [ ] Full league tier list and promotion window
- [ ] What a daily quest is and how it rewards
- [ ] Placement test: length, and how it maps to a starting unit
- [ ] Whether the reference blocks a lesson when the hearts run out — the observation
      stopped at the heart counter, so the blocking itself is **unverified**. We do not
      block either way.
