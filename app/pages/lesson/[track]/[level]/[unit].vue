<script setup lang="ts">
import type { ClientExercise } from "#shared/api/schemas"
import type { LessonExplanation } from "#shared/content/schema"

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
  locked: boolean
  exercises: ClientExercise[]
}

const { data: content } = await useFetch<UnitContent>(
  `/api/units/${track}/${level}/${unit}`,
)

const {
  phase,
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
</script>

<template>
  <main class="lesson">
    <header class="lesson__header">
      <NuxtLink class="lesson__back" to="/">← Learn</NuxtLink>

      <div v-if="!reading" class="lesson__progress">
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

      <LessonExplanationPanel v-if="content.explanation" :explanation="content.explanation" />

      <p v-if="content.locked" class="lesson__locked">
        This unit is still locked. Finish the unit before it, then come back.
      </p>

      <button
        v-else
        type="button"
        class="btn btn--primary"
        @click="begin"
      >
        Start the exercises
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
      <h1>Unit complete</h1>
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
  padding: var(--space-5) var(--space-4) var(--space-6);
}

.lesson__header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.lesson__back {
  color: var(--color-ink-soft);
  text-decoration: none;
  white-space: nowrap;
}

.lesson__progress {
  flex: 1;
  height: 12px;
  border-radius: 999px;
  background: var(--color-line);
  overflow: hidden;
}

.lesson__progress-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 200ms ease;
}

.lesson__xp {
  color: var(--color-ink-soft);
  font-weight: 700;
  white-space: nowrap;
}

.lesson__crumb {
  margin: 0 0 var(--space-4);
  color: var(--color-ink-soft);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.lesson__reading {
  display: grid;
  gap: var(--space-5);
  justify-items: start;
}

.lesson__title {
  font-size: 1.6rem;
}

.lesson__lead {
  margin: 0;
  color: var(--color-ink-soft);
}

.lesson__locked {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-wrong-soft);
  color: var(--color-wrong);
}

.lesson__hint {
  color: var(--color-ink-soft);
}

.lesson__body {
  display: grid;
  gap: var(--space-5);
}

.lesson__question {
  font-size: 1.5rem;
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

.lesson__summary {
  display: flex;
  gap: var(--space-5);
  margin: 0;
}

.lesson__summary dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-ink-soft);
}

.lesson__summary dd {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
}
</style>
