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
  font-family: var(--font-reading);
  font-size: 1.12rem;
  line-height: 1.65;
  color: var(--color-ink);
  max-width: 65ch;
}

.lesson__heading {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  margin-bottom: var(--space-2);
}

.lesson__body {
  margin: 0;
  font-family: var(--font-reading);
  font-size: 1.02rem;
  line-height: 1.7;
  color: var(--color-ink);
  max-width: 65ch;
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
  background: var(--color-surface-soft);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
}

.lesson__example-es {
  font-weight: 700;
  color: var(--color-accent);
}

.lesson__example-en {
  color: var(--color-ink-soft);
  font-size: 0.92rem;
}
</style>
