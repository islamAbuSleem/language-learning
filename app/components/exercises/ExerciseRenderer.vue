<script setup lang="ts">
import type { ClientExercise } from "#shared/api/schemas"

import ExerciseMatch from "./ExerciseMatch.vue"
import ExerciseSelect from "./ExerciseSelect.vue"
import ExerciseTypeIn from "./ExerciseTypeIn.vue"

/**
 * The renderer registry.
 *
 * Adding an exercise type means adding one component and one branch here.
 * The lesson player never learns what a type means.
 */
defineProps<{
  exercise: ClientExercise
  selection: string | null
  typed: string
  pairs: Record<string, string>
}>()

const emit = defineEmits<{
  "update:selection": [value: string]
  "update:typed": [value: string]
  "update:pairs": [value: Record<string, string>]
}>()
</script>

<template>
  <ExerciseSelect
    v-if="exercise.type === 'select' || exercise.type === 'listen'"
    :exercise="exercise"
    :model-value="selection"
    @update:model-value="emit('update:selection', $event)"
  />

  <ExerciseMatch
    v-else-if="exercise.type === 'match'"
    :exercise="exercise"
    :model-value="pairs"
    @update:model-value="emit('update:pairs', $event)"
  />

  <ExerciseTypeIn
    v-else-if="exercise.type === 'type_in'"
    :exercise="exercise"
    :model-value="typed"
    @update:model-value="emit('update:typed', $event)"
  />
</template>
