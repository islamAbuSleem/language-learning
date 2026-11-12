<script setup lang="ts">
/**
 * The app's icons, drawn in one place.
 *
 * Every icon is inline SVG with a single 1.75px stroke in currentColor. No
 * emoji, no glyph standing in for an icon.
 */
defineProps<{
  /** Which icon to draw. */
  name: "lock" | "check" | "chevron" | "speaker" | "back"
}>()
</script>

<template>
  <svg
    class="icon"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <g
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <template v-if="name === 'lock'">
        <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
        <path d="M5.5 7V5.25a2.5 2.5 0 0 1 5 0V7" />
        <circle cx="8" cy="10.25" r="0.6" fill="currentColor" stroke="none" />
      </template>
      <template v-else-if="name === 'check'">
        <path d="M3 8.5 6.5 12 13 4.5" />
      </template>
      <template v-else-if="name === 'chevron'">
        <path d="M6 3.5 10.5 8 6 12.5" />
      </template>
      <template v-else-if="name === 'speaker'">
        <path d="M2.5 6v4h2.5L9 13.5v-11L5 6H2.5Z" />
        <path d="M11 5.75a3.25 3.25 0 0 1 0 4.5" />
      </template>
      <template v-else-if="name === 'back'">
        <path d="M10 3.5 5.5 8l4.5 4.5" />
      </template>
    </g>
  </svg>
</template>

<style scoped>
.icon {
  flex: none;
  vertical-align: -2px;
}
</style>
