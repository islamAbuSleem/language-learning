<script setup lang="ts">
import type { ClientExercise } from "#shared/api/schemas"

type ChoiceExercise = Extract<ClientExercise, { type: "select" | "listen" }>

defineProps<{
  exercise: ChoiceExercise
  modelValue: string | null
}>()

const emit = defineEmits<{ "update:modelValue": [value: string] }>()
</script>

<template>
  <ul class="options">
    <li v-for="option in exercise.options" :key="option">
      <button
        type="button"
        class="option"
        :class="{ 'option--selected': modelValue === option }"
        @click="emit('update:modelValue', option)"
      >
        {{ option }}
      </button>
    </li>
  </ul>
</template>

<style scoped>
.options {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-3);
}

.option {
  width: 100%;
  text-align: left;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  font-size: 1.05rem;
  transition: border-color 120ms ease, background-color 120ms ease;
}

.option:hover {
  border-color: var(--color-accent);
}

.option--selected {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}
</style>
