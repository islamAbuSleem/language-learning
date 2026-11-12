# Goals

One goal at a time. Each goal says what "done" means, in words that can be
checked rather than felt.

## Goal 1 — the course has a voice of its own

**Status:** done

**Why.** The `listen` exercise is the one place a learner cannot read their way
out. Right now the browser speaks the word with whatever voice the machine
happens to have, which sounds like a sat-nav and is not the same on every
computer. A language app has to *sound* like the language, and the sound is
part of the course, not part of the browser.

**Definition of done**

- Every word in the Spanish track has an audio file, generated once and cached.
- The `listen` exercise plays that file, and falls back to the browser's voice
  when the file is missing.
- The audio is ours: spoken from our own vocabulary, with no third-party
  recording in it.
- One script rebuilds the audio from the vocabulary, so a new word is never
  silent.

**How it was done**

- `scripts/build-audio.mjs` speaks every word with eSpeak NG's Spanish voice,
  run locally through WebAssembly, and writes a cached MP3 per word into
  `public/audio/es/`. 920 words, about 4 MB.
- The file name is derived from the word, so the content builder and the
  audio builder agree without a manifest between them.
- The `listen` exercise carries the path of the recording, and the client
  plays it, falling back to the browser's voice if it is missing or fails.
- Every unit now has a listening exercise: hearing the word is the one thing
  a learner cannot do by reading.
- The test fails if any word in the track has no recording.

**The steps, in the order they were done**

| Step | What | Done when |
| --- | --- | --- |
| 1 | **Richer A1 content.** A real A1 course is 500 words, not 150. | **Done.** A1 holds 53 units and 530 words, the path audit is green, and the app plays all of it. |
| 2 | **A unit-revisit model.** A learner must be able to go back to a unit they are weak in, and see why. | **Done.** The path shows the status of every unit, weak units are offered back under *Worth another look*, and a unit can be done again. |
| 3 | **Recorded audio.** | **Done.** The definition of done above. |

Step 1 comes first because steps 2 and 3 are both measured against the size of
the course: a revisit model over 50 units is a different thing from a revisit
model over 15, and an audio dictionary is only worth building once the
vocabulary has stopped moving.

## Goal 2 — accounts that keep their progress

**Status:** in progress (email + password done)

**Why.** Right now every browser is a stranger: progress lives in a cookie
and dies with it. An account means picking up on the phone where the laptop
left off, and it is the door to anything public later. Nothing about the
course changes: the same path, the same SRS, keyed to the user instead of
the cookie.

**Definition of done**

- A learner can make an account and sign in with email and password, and
  the anonymous progress in their browser moves into the account instead of
  being stranded.
- A wrong password tells nothing: one message for a wrong email and a wrong
  password, and a login that costs a hashing round either way.
- Sessions expire, sign out forgets, and rate limits make guessing boring.
- The journey proves the whole loop: anonymous progress, signup, logout,
  login, and the progress still there.

**The steps, in the order they are done**

| Step | What | Done when |
| --- | --- | --- |
| 1 | **Email + password.** Self-contained, no external service. | **Done.** Scrypt hashes, timing-safe compare, merged progress, journey green. |
| 2 | **Magic link.** No passwords to remember. | **Done.** A link signs the learner in, once, within fifteen minutes; unconfigured mail stays a console link in dev. |
| 3 | **Google.** One click for everyone who has it. | **Done, except the live handshake.** The button appears when the client ID is set, the callback verifies state, exchanges the code and links by verified email; the Google side itself needs real credentials to try. |

## What comes next

- **The voice.** Piper is intelligible and it is ours, but it is a
  synthesiser, not a speaker. A native speaker recording the words would
  replace them file by file with `npm run import:audio -- <folder>`, no code
  change: the files are plain MP3 and the names are fixed.
- **The interface.** The engine, the path and the course are proven; the
  look is not. The dashboard, the lesson and the practice pages are due a
  visual world of their own.