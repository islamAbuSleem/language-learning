<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue"
import type { ClientExercise } from "#shared/api/schemas"

import AppIcon from "~/components/AppIcon.vue"
import ExerciseSelect from "./ExerciseSelect.vue"

type ListenExercise = Extract<ClientExercise, { type: "listen" }>

const props = defineProps<{
  exercise: ListenExercise
  modelValue: string | null
}>()

const emit = defineEmits<{ "update:modelValue": [value: string] }>()

const speaking = ref(false)

/** The recording we are playing, if there is one. */
let player: HTMLAudioElement | null = null

/**
 * The browser can speak the word itself.
 *
 * This is the fallback, not the course: the voice is whatever the machine
 * has installed, and it is not Spanish on a machine with no Spanish voice.
 * So it is only used when our own recording is missing.
 */
const supported = computed(() => typeof window !== "undefined" && "speechSynthesis" in window)

/** Speak the word with the browser's voice. */
function speakWithBrowser() {
  if (!supported.value) {
    speaking.value = false
    return
  }

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

/**
 * Play the word.
 *
 * Our own recording first, and the browser's voice if it is missing or fails
 * to play. Either way the learner hears the word.
 */
function play() {
  const file = props.exercise.audio.file

  if (!file) {
    speakWithBrowser()
    return
  }

  player?.pause()
  player = new Audio(file)
  player.onended = () => {
    speaking.value = false
  }
  player.onerror = () => {
    speaking.value = false
    speakWithBrowser()
  }

  speaking.value = true
  player.play().catch(() => {
    speaking.value = false
    speakWithBrowser()
  })
}

onBeforeUnmount(() => {
  player?.pause()
  player = null

  if (supported.value) window.speechSynthesis.cancel()
})
</script>

<template>
  <div class="listen">
    <button
      type="button"
      class="listen__play"
      :disabled="!supported && !exercise.audio.file"
      @click="play"
    >
      <AppIcon name="speaker" />
      {{ speaking ? "Playing…" : "Play the sound" }}
    </button>

    <p v-if="!supported && !exercise.audio.file" class="listen__note">
      This browser cannot speak the word.
    </p>

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
  border: 1px solid var(--color-line-strong);
  border-radius: 999px;
  background: var(--color-surface);
  font-weight: 700;
}

.listen__play:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.listen__note {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.9rem;
}
</style>
