# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One learner at first: the person building this, using it every day to learn
Spanish from English, starting as an absolute beginner. It gets opened on a
phone and on a laptop, and the layout has to hold up at both without
favouring either.

The stated intention is to open it up — with accounts and profiles — and make
it public and free for other learners, once the course earns its keep in
daily use. That is an intention, not a shipped fact: there are no accounts
and no other learners yet.

## Product Purpose

A Spanish course that takes a complete beginner to B2 without a hole in the
path, and that teaches the grammar before asking the learner to use it.

Success for the learner: every unit explains one rule, drills it, and is
followed by the words of a real topic. Success for the product: the learner
comes back tomorrow, because the path is worth walking and nothing punishes
them for a bad day.

## Positioning

A free learning tool, not a game with a course bolted on. Three claims a
neighbouring product could not truthfully copy:

1. **The path has no gaps.** A0 to B2, every unit teaching something new and
   nothing used before it is taught — and an automated audit that fails the
   build when that stops being true.
2. **Nothing blocks.** No hearts, no paywall, no streak ransom. A wrong
   answer costs mastery and nothing else; the lesson never stops you.
3. **The course owns its voice.** Every word has a recording the project
   generated itself, so the course sounds the same on every machine instead
   of borrowing whatever voice the browser has.

The lesson is read first and practised second. The loop is
explain → drill → remember → come back.

## Operating Context

- A daily session is one unit: a lesson read, then ten exercises.
- Spaced repetition decides what comes back. Items the learner has met
  return on their own schedule; a unit answered badly is offered again.
- The learner's errors are counted against their learning: the words they
  got wrong and have not made solid, as a share of everything they have met.
  When that share is over 20%, the path waits until the errors are practised.
- Progress lives in Postgres, keyed to a learner id in a cookie, so it
  survives a restart and stays per browser until accounts exist.
- The learner is the person who wrote the course, so the course has to be
  finished to the standard they expect from a published product.

## Capabilities and Constraints

Confirmed and shipped:

- A path of 95 units (A0 2, A1 50, A2 17, B1 14, B2 12), 950 words, every
  unit with a lesson, examples, drills and ten words.
- Exercise content is data, not code: JSON files validated by one schema.
  Exercises are generated from the vocabulary.
- Four exercise shapes, and every unit has a listening exercise.
- Spaced repetition with self-grading; XP and a streak; a practice loop;
  unit locking along the path; a revisit path for weak units.
- An error gate: the learner's mistakes are listed with their share of what
  they have learned, and the path waits for them until they are practised.
- A failed save is reported with a way forward instead of a silent stall.
- The course's own generated audio, one cached recording per word.

Constraints that future work must preserve:

- **Legal.** Mechanics and game design may be studied and re-implemented.
  Lesson text, illustrations, audio, icons, brand, trademark and word-for-word
  UI copy from the reference app are never copied. Everything shipped is
  written or drawn by us. No dependency on the reference app's private API.
- **One interface language: English.** The course is (content, source
  language); a course in German from English reuses the English interface.
- **Spanish first.** German and English tracks come later.
- **Stack.** Nuxt 4 with Nitro: one project for the learner UI and the API.
  The SRS engine is framework-free and pure TypeScript, tested without a
  server. Content is files. Postgres (Neon) for persistence.
- **Evidence discipline.** Claims about the reference app cite a REA
  evidence id. Observed, inferred and unknown stay apart.

Open, deliberately undecided:

- The product name. "Language App" is the working name in the interface.
- Accounts, profiles, and what a public learner's data model becomes.
- The voice: the recordings are a synthesised voice. A native speaker
  replacing them file by file is the intended direction.

## Brand Commitments

- Working name **Language App**, with the line "Learn without limits,
  without a paywall."
- The voice is plain and honest: no hype, no streaks-as-shame, no
  growth-hack copy. The interface says what happened and what to do next.
- Our own palette and type. Nothing is lifted from the reference app, and
  the UI copy is ours word for word.
- The course is free of charge, now and later.

## Evidence on Hand

- `docs/rea/findings-ledger.md` — the reference app's behaviour, every claim
  tied to a REA evidence id, with the limits of each observation carried
  across.
- `scripts/audit-path.mjs` — the gapless audit; fails the build.
- `scripts/check-content.mjs` — stray characters and words taught twice.
- `scripts/journey.mjs` — the learner loop end to end, lock to revisit.
- 920 words with their own recordings.
- Screenshots of the built interface under `docs/screenshots/`.

Absent, and not to be invented: no user research, no analytics, no
testimonials, no usage data, no learning-science claims.

## Product Principles

1. **Explain before you test.** The learner reads the rule, then meets it.
   A unit that only exercises a rule teaches nothing.
2. **Never block.** No hearts, no paywall, no lock that cannot be opened by
   doing the work. The path waits when too much of what the learner has
   learned is still wrong — over a fifth of it — and the wait lifts the
   moment those errors are practised. It names the errors, shows the share,
   and points at the practice that clears them. A unit already started is
   never held back, and a failed save is always reported with a way out.
3. **Say what happened.** Progress is measured and shown honestly — a score
   of 60% is a score of 60%, and a weak unit is called weak.
4. **Own the whole course.** Content, audio and interface are ours, so the
   course sounds and reads the same everywhere.
5. **Prove it, then claim it.** The audits, the tests and the journey script
   are the evidence; the marketing copy is downstream of them.

## Accessibility & Inclusion

No formal standard has been set. What the code already guarantees, and must
keep guaranteeing: text labels on every control, a visible focus state, and
enough contrast to read the exercise comfortably. The layout is required to
hold at both a phone width and a laptop width without favouring either.
Open: whether a target WCAG level should be adopted and enforced by a test.
