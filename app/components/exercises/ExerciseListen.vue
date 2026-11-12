<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue"
import type { ClientExercise } from "#shared/api/schemas"

import ExerciseSelect from "./ExerciseSelect.vue"

type ListenExercise = Extract<ClientExercise, { type: "listen" }>

const props = defineProps<{
  exercise: ListenExercise
  modelValue: string | null
}>()

const emit = defineEmits<{ "update:modelValue": [value: string] }>()

const speaking = ref(false)

/**
 * v0 speaks the word with the browser's own voice.
 *
 * There is no recorded audio yet, so this is a stand-in: the word is handed
 * to the speech synthesis engine in the target language. When real audio
 * arrives, this button plays a file instead and nothing else changes.
 */
const supported = computed(() => typeof window !== "undefined" && "speechSynthesis" in window)

function speak() {
  if (!supported.value) return

  const synth = window.speechSynthesis
  synth.cancel()

  const utterance = new SpeechSynthesisUtterance(props.exercise.audio.text)
  utterance.lang = props.exercise.audio.lang
  utterance.onend = () => {
    speaking.value = false
  }
  utterance.onerror = () => {
    speaking.value = false
  }

  speaking.value = true
  synth.speak(utterance)
}

onBeforeUnmount(() => {
  if (supported.value) window.speechSynthesis.cancel()
})
</script>

<template>
  <div class="listen">
    <button
      type="button"
      class="listen__play"
      :disabled="!supported"
      @click="speak"
    >
      <span aria-hidden="true">🔊</span>
      {{ speaking ? "Playing…" : "Play the sound" }}
    </button>

    <p v-if="!supported" class="listen__note">This browser cannot speak the word.</p>

    <ExerciseSelect
      :exercise="exercise"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>
</template>

<style scoped>
.listen {
  display: grid;
  gap: var(--space-4);
}

.listen__play {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-weight: 600;
}

.listen__play:hover:not(:disabled) {
  border-color: var(--color-accent);
}

.listen__note {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.9rem;
}
</style>
