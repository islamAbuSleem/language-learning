<script setup lang="ts">
import type { ClientExercise } from "#shared/api/schemas"
import type { LessonExplanation } from "#shared/content/schema"

import AppIcon from "~/components/AppIcon.vue"
import ExerciseRenderer from "~/components/exercises/ExerciseRenderer.vue"
import LessonExplanationPanel from "~/components/lesson/LessonExplanation.vue"
import LessonFeedbackPanel from "~/components/lesson/FeedbackPanel.vue"

const route = useRoute()
const track = String(route.params.track)
const level = String(route.params.level)
const unit = Number(route.params.unit)

interface UnitContent {
  title: string
  description: string
  explanation: LessonExplanation | null
  words: string[]
  locked: boolean
  continueTo: { track: string; level: string; unit: number } | null
  status: "locked" | "current" | "done" | "weak"
  accuracy: number | null
  shaky: number
  /** Misses of this unit that are still shaky: what a repair round asks. */
  repairable: number
  exercises: ClientExercise[]
}

const { data: content, refresh: refreshContent } = await useFetch<UnitContent>(
  `/api/units/${track}/${level}/${unit}`,
)

/**
 * What to say when the learner comes back to a unit they have already done.
 *
 * A finished unit is not a locked one: the learner is allowed to do it again,
 * and the page says why they are here.
 */
const revisitNote = computed(() => {
  if (!content.value) return null
  if (content.value.status === "weak") {
    const score = Math.round((content.value.accuracy ?? 0) * 100)

    if (content.value.repairable > 0) {
      return `You answered ${score}% of this unit last time. Fix the ${content.value.repairable} you missed, or do the whole unit again.`
    }

    return `You answered ${score}% of this unit last time. Do it again and see if it sticks.`
  }
  if (content.value.status === "done") {
    return "You have already finished this unit. Have another go to keep it fresh."
  }

  return null
})

const {
  phase,
  mode,
  exercise,
  feedback,
  profile,
  index,
  total,
  summary,
  selection,
  typed,
  matchedPairs,
  canCheck,
  saving,
  error,
  start,
  startRepair,
  check,
  skip,
  complete,
} = useLessonSession(track, level, unit)

/** The lesson is read first, and the exercises start when the learner says so. */
const reading = ref(true)

function begin() {
  reading.value = false
  void start()
}

function beginRepair() {
  reading.value = false
  void startRepair()
}

/**
 * Where the unit stands after a repair round, in the page's own words.
 *
 * A repair answers only the misses, and every answer counts toward the 80%
 * line — so the page says the new score honestly instead of declaring
 * victory. Null until the refreshed unit content arrives.
 */
const repairStanding = computed(() => {
  if (mode.value !== "repair" || !content.value || content.value.accuracy === null) return null

  const score = Math.round(content.value.accuracy * 100)

  if (content.value.status === "weak") {
    return `The unit sits at ${score}% now — one more clean round should do it.`
  }

  return `The unit sits at ${score}% now — solid.`
})

const doneHeading = computed(() => {
  if (mode.value !== "repair") return "Unit complete"
  if (summary.value.incorrect > 0) return "Repair round done"

  return "Misses fixed"
})

// After a repair round the unit's own score may have moved, so the page
// re-reads it before saying where things stand.
watch(phase, (next) => {
  if (next === "done" && mode.value === "repair") {
    void refreshContent()
  }
})
</script>

<template>
  <main class="lesson">
    <header class="lesson__header">
      <NuxtLink class="lesson__back" to="/"><AppIcon name="back" /> Learn</NuxtLink>

      <div
        v-if="!reading"
        class="lesson__progress"
        role="progressbar"
        :aria-valuenow="total > 0 ? Math.round((index / total) * 100) : 0"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          class="lesson__progress-fill"
          :style="{ width: `${total > 0 ? (index / total) * 100 : 0}%` }"
        />
      </div>

      <span v-if="profile && !reading" class="lesson__xp">{{ profile.xp }} xp</span>
    </header>

    <p class="lesson__crumb">{{ level }} · Unit {{ unit }}</p>

    <!-- the lesson -->
    <section v-if="reading && content" class="lesson__reading">
      <h1 class="lesson__title">{{ content.title }}</h1>
      <p class="lesson__lead">{{ content.description }}</p>

      <LessonExplanationPanel
        v-if="content.explanation"
        :explanation="content.explanation"
        :words="content.words"
      />

      <p v-if="revisitNote" class="lesson__revisit">{{ revisitNote }}</p>

      <p v-if="content.locked" class="lesson__locked">
        This unit is still locked. Finish the unit before it, then come back.
      </p>

      <NuxtLink
        v-if="content.locked && content.continueTo"
        class="btn btn--primary"
        :to="{
          path: `/lesson/${content.continueTo.track}/${content.continueTo.level}/${content.continueTo.unit}`,
        }"
      >
        Take me there
      </NuxtLink>

      <div
        v-if="!content.locked && content.status === 'weak' && content.repairable > 0"
        class="lesson__repair"
      >
        <button type="button" class="btn btn--primary btn--large" @click="beginRepair">
          Fix the {{ content.repairable }} you missed
        </button>
        <button type="button" class="btn btn--ghost" @click="begin">
          Do the whole unit again
        </button>
      </div>

      <button
        v-if="!content.locked && !(content.status === 'weak' && content.repairable > 0)"
        type="button"
        class="btn btn--primary btn--large"
        @click="begin"
      >
        {{ content.status === "current" ? "Start the exercises" : "Do it again" }}
      </button>
    </section>

    <!-- the exercises -->
    <p v-else-if="phase === 'loading'" class="lesson__hint">Loading…</p>

    <section v-else-if="error" class="card lesson__done">
      <h1>Not yet</h1>
      <p class="lesson__lead">{{ error }}</p>
      <NuxtLink class="btn btn--primary" to="/">Back to the path</NuxtLink>
    </section>

    <section v-else-if="phase === 'done'" class="card lesson__done">
      <h1>{{ doneHeading }}</h1>
      <p v-if="mode === 'repair' && repairStanding" class="lesson__lead">{{ repairStanding }}</p>
      <dl class="lesson__summary">
        <div>
          <dt>Correct</dt>
          <dd>{{ summary.correct }}</dd>
        </div>
        <div>
          <dt>Missed</dt>
          <dd>{{ summary.incorrect }}</dd>
        </div>
        <div>
          <dt>Skipped</dt>
          <dd>{{ summary.skipped }}</dd>
        </div>
        <div>
          <dt>XP</dt>
          <dd>{{ summary.xp }}</dd>
        </div>
      </dl>
      <NuxtLink class="btn btn--primary" to="/">Back to the path</NuxtLink>
    </section>

    <section
      v-else-if="exercise"
      class="lesson__body"
      :class="{ 'lesson__body--saving': saving }"
    >
      <h1 class="lesson__question">{{ exercise.prompt }}</h1>

      <ExerciseRenderer
        :exercise="exercise"
        :selection="selection"
        :typed="typed"
        :pairs="matchedPairs"
        @update:selection="selection = $event"
        @update:typed="typed = $event"
        @update:pairs="matchedPairs = $event"
      />

      <div v-if="phase === 'answering'" class="lesson__actions">
        <button type="button" class="btn btn--ghost" :disabled="saving" @click="skip()">Skip</button>
        <button
          type="button"
          class="btn btn--primary"
          :disabled="!canCheck || saving"
          @click="check()"
        >
          Check
        </button>
      </div>

      <LessonFeedbackPanel
        v-else-if="phase === 'feedback' && feedback"
        :feedback="feedback"
        @continue="complete($event)"
      />

      <p v-if="saving" class="lesson__saving">Saving…</p>
    </section>
  </main>
</template>

<style scoped>
.lesson {
  max-width: 680px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) var(--space-7);
}

.lesson__header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.lesson__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-ink-soft);
  text-decoration: none;
  white-space: nowrap;
  font-weight: 600;
  font-size: 0.92rem;
}

.lesson__back:hover {
  color: var(--color-ink);
}

.lesson__progress {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: var(--color-line);
  overflow: hidden;
}

.lesson__progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 999px;
  transition: width 200ms ease;
}

.lesson__xp {
  color: var(--color-ink);
  font-weight: 800;
  white-space: nowrap;
}

.lesson__crumb {
  margin: 0 0 var(--space-4);
  color: var(--color-ink-soft);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.lesson__reading {
  display: grid;
  gap: var(--space-4);
  justify-items: start;
}

/* The unit you are on, set large. The one display voice on the page. */
.lesson__title {
  font-family: var(--font-display);
  font-size: clamp(1.9rem, 1.5rem + 2.5vw, 2.5rem);
  line-height: 1.08;
  font-weight: 400;
  max-width: 20ch;
}

.lesson__lead {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 1.05rem;
  max-width: 65ch;
}

.lesson__locked {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-wrong-soft);
  border: 1px solid var(--color-wrong);
  color: var(--color-wrong);
}

.lesson__revisit {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-gold-soft);
  border: 1px solid var(--color-gold-strong);
  color: var(--color-ink);
}

/* The short way back: fix the misses first, the whole unit only if asked. */
.lesson__repair {
  display: grid;
  gap: var(--space-2);
  justify-items: start;
}

.lesson__hint {
  color: var(--color-ink-soft);
}

.lesson__body {
  display: grid;
  gap: var(--space-5);
}

.lesson__question {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.lesson__actions {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.lesson__body--saving {
  opacity: 0.7;
  pointer-events: none;
}

.lesson__saving {
  margin: 0;
  text-align: center;
  color: var(--color-ink-soft);
  font-size: 0.9rem;
}

.lesson__done {
  display: grid;
  gap: var(--space-4);
  justify-items: start;
}

.lesson__done h1 {
  font-family: var(--font-display);
  font-size: 1.8rem;
  font-weight: 400;
}

.lesson__summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4) var(--space-5);
  margin: 0;
}

.lesson__summary dt {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-ink-soft);
}

.lesson__summary dd {
  margin: var(--space-1) 0 0;
  font-size: 1.5rem;
  font-weight: 800;
}

.btn--large {
  font-size: 1.05rem;
  padding: var(--space-4) var(--space-6);
}
</style>
