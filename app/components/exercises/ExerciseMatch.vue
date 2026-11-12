<script setup lang="ts">
import { computed, ref } from "vue"
import type { ClientExercise } from "#shared/api/schemas"

type MatchExercise = Extract<ClientExercise, { type: "match" }>

const props = defineProps<{
  exercise: MatchExercise
  modelValue: Record<string, string>
}>()

const emit = defineEmits<{ "update:modelValue": [value: Record<string, string>] }>()

const pendingLeft = ref<string | null>(null)

const leftItems = computed(() => props.exercise.pairs.map((pair) => pair.left))

/** The right column is reversed so the answers never line up with the prompts. */
const rightItems = computed(() => [...props.exercise.pairs].map((pair) => pair.right).reverse())

const pairedRight = computed(() => new Set(Object.values(props.modelValue)))

function chooseLeft(item: string) {
  if (props.modelValue[item]) return
  pendingLeft.value = pendingLeft.value === item ? null : item
}

function chooseRight(right: string) {
  if (!pendingLeft.value) return
  if (pairedRight.value.has(right)) return

  emit("update:modelValue", { ...props.modelValue, [pendingLeft.value]: right })
  pendingLeft.value = null
}
</script>

<template>
  <div class="match">
    <ul class="match__column">
      <li v-for="item in leftItems" :key="item">
        <button
          type="button"
          class="match__item"
          :class="{
            'match__item--pending': pendingLeft === item,
            'match__item--done': modelValue[item],
          }"
          @click="chooseLeft(item)"
        >
          <span>{{ item }}</span>
          <span v-if="modelValue[item]" class="match__pair">{{ modelValue[item] }}</span>
        </button>
      </li>
    </ul>

    <ul class="match__column">
      <li v-for="item in rightItems" :key="item">
        <button
          type="button"
          class="match__item"
          :class="{ 'match__item--used': pairedRight.has(item) }"
          :disabled="pairedRight.has(item)"
          @click="chooseRight(item)"
        >
          {{ item }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.match {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.match__column {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-3);
}

.match__item {
  width: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
  text-align: left;
  font-weight: 500;
}

.match__item--pending {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  font-weight: 700;
}

.match__item--done {
  border-color: var(--color-correct);
  background: var(--color-correct-soft);
}

.match__item--used {
  opacity: 0.45;
}

.match__pair {
  color: var(--color-correct);
  font-weight: 700;
}
</style>
