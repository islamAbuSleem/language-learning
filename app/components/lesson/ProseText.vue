<script setup lang="ts">
import { computed } from "vue"

import { splitProse } from "#shared/content/highlight"

/**
 * English prose with the Spanish inside it painted pine.
 *
 * Lessons explain the grammar in English and show it in Spanish, often in
 * the same sentence. This splits the sentence and marks the Spanish words
 * so the learner sees at a glance which words belong to which language.
 */
const props = defineProps<{
  text: string
  /** The unit's own Spanish words. Without them only accents and function words mark Spanish. */
  words?: string[]
}>()

const segments = computed(() => splitProse(props.text, props.words ?? []))
</script>

<template>
  <span class="prose"><template v-for="(segment, index) in segments" :key="index"><strong v-if="segment.spanish" class="prose__es">{{ segment.text }}</strong><template v-else>{{ segment.text }}</template></template></span>
</template>

<style scoped>
.prose {
  font: inherit;
  color: inherit;
}

.prose__es {
  font-weight: 600;
  color: var(--color-accent);
}
</style>
