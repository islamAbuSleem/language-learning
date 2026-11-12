# Goals

One goal at a time. Each goal says what "done" means, in words that can be
checked rather than felt.

## Goal 1 — the course has a voice of its own

**Status:** in progress

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

**The steps, in the order they are done**

| Step | What | Done when |
| --- | --- | --- |
| 1 | **Richer A1 content.** A real A1 course is 500 words, not 150. | **Done.** A1 holds 50 units and 500 words, the path audit is green, and the app plays all of it. |
| 2 | **A unit-revisit model.** A learner must be able to go back to a unit they are weak in, and see why. | The path shows what each unit is worth to the learner, weak units offer themselves, and a unit can be redone. |
| 3 | **Recorded audio.** | The definition of done above. |

Step 1 comes first because steps 2 and 3 are both measured against the size of
the course: a revisit model over 50 units is a different thing from a revisit
model over 15, and an audio dictionary is only worth building once the
vocabulary has stopped moving.
