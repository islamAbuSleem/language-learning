<script setup lang="ts">
import { ref } from "vue"
import type { LessonFeedback } from "~/composables/useLessonSession"
import type { DifficultyGrade } from "#shared/srs/types"

/**
 * The feedback panel.
 *
 * It shows the solution and asks the learner how the item felt. That self
 * grade is the signal the SRS engine learns from, so it is offered every time
 * but never required.
 */
defineProps<{
  feedback: LessonFeedback
}>()

const emit = defineEmits<{ continue: [grade: DifficultyGrade] }>()

const grade = ref<DifficultyGrade>("neutral")
</script>

<template>
  <section
    class="feedback"
    :class="feedback.outcome === 'correct' ? 'feedback--correct' : 'feedback--wrong'"
  >
    <h2 class="feedback__title">
      {{
        feedback.outcome === "correct"
          ? "Correct"
          : feedback.outcome === "skipped"
            ? "Skipped"
            : "Not quite"
      }}
    </h2>

    <p class="feedback__answer">
      Correct solution: <strong>{{ feedback.correctAnswer }}</strong>
    </p>
    <p v-if="feedback.translation" class="feedback__translation">{{ feedback.translation }}</p>
    <p v-if="feedback.note" class="feedback__note">{{ feedback.note }}</p>

    <div class="feedback__grade">
      <span class="feedback__grade-label">How did that feel?</span>
      <div class="feedback__grade-buttons">
        <button
          type="button"
          class="btn btn--ghost"
          :class="{ 'is-active': grade === 'too_easy' }"
          @click="grade = 'too_easy'"
        >
          Too easy
        </button>
        <button
          type="button"
          class="btn btn--ghost"
          :class="{ 'is-active': grade === 'too_difficult' }"
          @click="grade = 'too_difficult'"
        >
          Too difficult
        </button>
      </div>
    </div>

    <button type="button" class="btn btn--primary" @click="emit('continue', grade)">
      Continue
    </button>
  </section>
</template>

<style scoped>
.feedback {
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  border: 1px solid var(--color-line-strong);
  background: var(--color-surface);
}

.feedback--correct {
  background: var(--color-correct-soft);
  border-color: var(--color-correct);
}

.feedback--wrong {
  background: var(--color-wrong-soft);
  border-color: var(--color-wrong);
}

.feedback__title {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.feedback--correct .feedback__title {
  color: var(--color-correct);
}

.feedback--wrong .feedback__title {
  color: var(--color-wrong);
}

.feedback__answer {
  margin: var(--space-2) 0 0;
}

.feedback__translation {
  margin: var(--space-1) 0 0;
  color: var(--color-ink-soft);
}

.feedback__note {
  margin: var(--space-3) 0 0;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-soft);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  max-width: 65ch;
}

.feedback__grade {
  margin: var(--space-5) 0;
}

.feedback__grade-label {
  display: block;
  font-size: 0.9rem;
  color: var(--color-ink-soft);
  margin-bottom: var(--space-2);
}

.feedback__grade-buttons {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.is-active {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
}
</style>
