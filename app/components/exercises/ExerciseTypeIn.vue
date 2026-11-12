<script setup lang="ts">
import type { ClientExercise } from "#shared/api/schemas"

type TypeInExercise = Extract<ClientExercise, { type: "type_in" }>

defineProps<{
  exercise: TypeInExercise
  modelValue: string
}>()

const emit = defineEmits<{ "update:modelValue": [value: string] }>()

function onInput(event: Event) {
  const target = event.target
  if (target instanceof HTMLInputElement) {
    emit("update:modelValue", target.value)
  }
}
</script>

<template>
  <form class="typed" @submit.prevent>
    <input
      class="typed__input"
      type="text"
      inputmode="text"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      placeholder="Type in Spanish"
      :value="modelValue"
      @input="onInput"
    />
  </form>
</template>

<style scoped>
.typed {
  display: flex;
}

.typed__input {
  width: 100%;
  padding: var(--space-4);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.typed__input:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}
</style>
