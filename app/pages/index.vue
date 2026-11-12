<script setup lang="ts">
import type { ItemProgressPayload, LearnerProfilePayload } from "#shared/api/schemas"

interface TrackSummary {
  id: string
  units: {
    unit: number
    title: string
    description: string
    exerciseCount: number
  }[]
}

const { data: tracks } = await useFetch<{ tracks: TrackSummary[] }>("/api/tracks")
const { data: progress } = await useFetch<{
  profile: LearnerProfilePayload
  items: ItemProgressPayload[]
}>("/api/progress")

const profile = computed(() => progress.value?.profile ?? null)

const trackName: Record<string, string> = {
  es: "Spanish",
  de: "German",
  en: "English",
}

/** The units the learner has already touched, keyed by unit id. */
const touchedUnits = computed(() => {
  const touched = new Set<string>()
  for (const item of progress.value?.items ?? []) {
    const parts = item.itemId.split("/")
    if (parts.length >= 2) touched.add(`${parts[0]}/${parts[1]}`)
  }
  return touched
})
</script>

<template>
  <main class="dashboard">
    <header class="dashboard__header">
      <div>
        <h1 class="dashboard__title">Language App</h1>
        <p class="dashboard__subtitle">Learn without limits, without a paywall.</p>
      </div>

      <dl v-if="profile" class="chips">
        <div class="chip">
          <dt>Streak</dt>
          <dd>{{ profile.streak }}</dd>
        </div>
        <div class="chip">
          <dt>XP</dt>
          <dd>{{ profile.xp }}</dd>
        </div>
        <div class="chip">
          <dt>Hearts</dt>
          <dd>{{ profile.hearts }} / {{ profile.maxHearts }}</dd>
        </div>
      </dl>
    </header>

    <section v-for="track in tracks?.tracks ?? []" :key="track.id" class="track">
      <h2 class="track__title">{{ trackName[track.id] ?? track.id }}</h2>

      <ul class="units">
        <li v-for="unit in track.units" :key="unit.unit">
          <NuxtLink
            class="unit"
            :class="{ 'unit--started': touchedUnits.has(`${track.id}/u${unit.unit}`) }"
            :to="{ path: `/lesson/${unit.unit}`, query: { track: track.id } }"
          >
            <span class="unit__number">{{ unit.unit }}</span>
            <span class="unit__body">
              <span class="unit__name">{{ unit.title }}</span>
              <span class="unit__description">{{ unit.description }}</span>
            </span>
            <span class="unit__count">{{ unit.exerciseCount }} exercises</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <p v-if="(tracks?.tracks ?? []).length === 0" class="dashboard__empty">
      No content yet.
    </p>
  </main>
</template>

<style scoped>
.dashboard {
  max-width: 760px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
}

.dashboard__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
}

.dashboard__title {
  font-size: 1.8rem;
}

.dashboard__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--color-ink-soft);
}

.dashboard__empty {
  color: var(--color-ink-soft);
}

.chips {
  display: flex;
  gap: var(--space-3);
  margin: 0;
}

.chip {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  text-align: center;
}

.chip dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-ink-soft);
}

.chip dd {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.track {
  margin-bottom: var(--space-6);
}

.track__title {
  font-size: 1.15rem;
  margin-bottom: var(--space-3);
}

.units {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-3);
}

.unit {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  text-decoration: none;
  color: inherit;
}

.unit:hover {
  border-color: var(--color-accent);
}

.unit--started {
  background: var(--color-accent-soft);
}

.unit__number {
  width: 40px;
  height: 40px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
  font-weight: 700;
}

.unit__body {
  display: grid;
  gap: 2px;
  flex: 1;
}

.unit__name {
  font-weight: 600;
}

.unit__description {
  color: var(--color-ink-soft);
  font-size: 0.92rem;
}

.unit__count {
  color: var(--color-ink-soft);
  font-size: 0.85rem;
  white-space: nowrap;
}
</style>
