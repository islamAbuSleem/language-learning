<script setup lang="ts">
import type { LessonExplanation } from "#shared/content/schema"

/**
 * The grammar lesson.
 *
 * Read before the exercises: the learner meets the rule, then practises it.
 */
defineProps<{
  explanation: LessonExplanation
}>()
</script>

<template>
  <article class="lesson">
    <p class="lesson__summary">{{ explanation.summary }}</p>

    <section v-for="section in explanation.sections" :key="section.heading" class="lesson__section">
      <h2 class="lesson__heading">{{ section.heading }}</h2>

      <p v-if="section.body" class="lesson__body">{{ section.body }}</p>

      <ul v-if="section.examples?.length" class="lesson__examples">
        <li v-for="example in section.examples" :key="example.es">
          <span class="lesson__example-es">{{ example.es }}</span>
          <span class="lesson__example-en">{{ example.en }}</span>
        </li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.lesson {
  display: grid;
  gap: var(--space-5);
}

.lesson__summary {
  margin: 0;
  font-size: 1.05rem;
  color: var(--color-ink);
}

.lesson__heading {
  font-size: 1.05rem;
  margin-bottom: var(--space-2);
}

.lesson__body {
  margin: 0;
  color: var(--color-ink-soft);
}

.lesson__examples {
  list-style: none;
  margin: var(--space-3) 0 0;
  padding: 0;
  display: grid;
  gap: var(--space-2);
}

.lesson__examples li {
  display: grid;
  gap: 2px;
  padding: var(--space-3) var(--space-4);
  background: var(--color-canvas);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-accent);
}

.lesson__example-es {
  font-weight: 600;
}

.lesson__example-en {
  color: var(--color-ink-soft);
  font-size: 0.92rem;
}
</style>
