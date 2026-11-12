<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue"
import type { ClientExercise } from "#shared/api/schemas"

import AppIcon from "~/components/AppIcon.vue"

type ChoiceExercise = Extract<ClientExercise, { type: "select" | "listen" }>

const props = defineProps<{
  exercise: ChoiceExercise
  modelValue: string | null
}>()

const emit = defineEmits<{ "update:modelValue": [value: string] }>()

/** The recording we are playing, if there is one. */
let player: HTMLAudioElement | null = null

const playing = ref<string | null>(null)

/**
 * The browser can speak the word itself.
 *
 * This is the fallback, not the course: it is only used when our own
 * recording is missing or fails to play.
 */
const supported = computed(() => typeof window !== "undefined" && "speechSynthesis" in window)

/**
 * Hear one option.
 *
 * Tapping the speaker never answers: the buttons are siblings, so hearing a
 * word and choosing it are two separate acts.
 */
function hear(option: string) {
  const file = props.exercise.audioFiles[option]

  player?.pause()
  playing.value = option

  if (!file) {
    speakWithBrowser(option)
    return
  }

  player = new Audio(file)
  player.onended = () => {
    playing.value = null
  }
  player.onerror = () => {
    speakWithBrowser(option)
  }

  player.play().catch(() => speakWithBrowser(option))
}

function speakWithBrowser(option: string) {
  playing.value = null
  if (!supported.value) return

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(option)
  utterance.lang = "es"
  window.speechSynthesis.speak(utterance)
}

onBeforeUnmount(() => {
  player?.pause()
  player = null
})
</script>

<template>
  <ul class="options">
    <li v-for="option in exercise.options" :key="option" class="option-row">
      <button
        type="button"
        class="option"
        :class="{ 'option--selected': modelValue === option }"
        @click="emit('update:modelValue', option)"
      >
        {{ option }}
      </button>
      <button
        type="button"
        class="option__play"
        :class="{ 'option__play--playing': playing === option }"
        :aria-label="`Hear ${option}`"
        :title="`Hear ${option}`"
        @click="hear(option)"
      >
        <AppIcon name="speaker" />
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
  gap: var(--space-2);
}

.option-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-2);
  align-items: stretch;
}

.option {
  width: 100%;
  text-align: left;
  background: var(--color-surface);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: 1.05rem;
  font-weight: 500;
  transition: border-color 120ms ease, background-color 120ms ease;
}

.option:hover {
  border-color: var(--color-accent);
}

.option--selected {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  font-weight: 700;
}

.option__play {
  flex: none;
  width: 3.25rem;
  display: grid;
  place-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  color: var(--color-ink-soft);
  transition: border-color 120ms ease, color 120ms ease;
}

.option__play:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.option__play--playing {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-soft);
}
</style>
