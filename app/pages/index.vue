<script setup lang="ts">
import type { ItemProgressPayload, LearnerProfilePayload } from "#shared/api/schemas"
import { PRACTICE_MASTERY_CEILING } from "#shared/srs/types"

interface LevelSummary {
  level: string
  title: string
  description: string
  grammar: string[]
  units: {
    unit: number
    title: string
    description: string
    exerciseCount: number
    completed: boolean
    locked: boolean
  }[]
}

interface TrackSummary {
  id: string
  name: string
  levels: LevelSummary[]
}

const { data: tracks } = await useFetch<{ tracks: TrackSummary[] }>("/api/tracks")

// The learner lives in a cookie, so the server has to receive it: without the
// forwarded cookie the page would render a different, empty learner.
const { data: progress } = await useFetch<{
  profile: LearnerProfilePayload
  items: ItemProgressPayload[]
}>("/api/progress", { headers: useRequestHeaders(["cookie"]) })

const profile = computed(() => progress.value?.profile ?? null)

/** The units the learner has met and is still shaky on. */
const weakItems = computed(
  () => (progress.value?.items ?? []).filter((item) => item.mastery < PRACTICE_MASTERY_CEILING),
)

/** The ones the schedule says are due back now. */
const dueItems = computed(
  () => weakItems.value.filter((item) => item.dueAt <= Date.now()),
)

interface UnitSummary {
  unit: number
  title: string
  description: string
  exerciseCount: number
  completed: boolean
  locked: boolean
}

/** Every unit of every track, in the order the learner meets them. */
const allUnits = computed<{ track: string; level: string; unit: UnitSummary }[]>(() => {
  const units: { track: string; level: string; unit: UnitSummary }[] = []

  for (const track of tracks.value?.tracks ?? []) {
    for (const level of track.levels) {
      for (const unit of level.units) {
        units.push({ track: track.id, level: level.level, unit })
      }
    }
  }

  return units
})

/** Where the learner is: the first unit they have not finished. */
const currentUnit = computed(() => allUnits.value.find((entry) => !entry.unit.completed) ?? null)

const unitsDone = computed(() => allUnits.value.filter((entry) => entry.unit.completed).length)

const progressPercent = computed(() => {
  const total = allUnits.value.length
  if (total === 0) return 0

  return Math.round((unitsDone.value / total) * 100)
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
      </dl>
    </header>

    <section v-if="currentUnit" class="continue">
      <div class="continue__body">
        <p class="continue__eyebrow">
          {{ currentUnit.level }} · Unit {{ currentUnit.unit.unit }}
        </p>
        <h2 class="continue__title">{{ currentUnit.unit.title }}</h2>
        <p class="continue__note">{{ currentUnit.unit.description }}</p>
      </div>
      <NuxtLink
        class="btn btn--primary"
        :to="{
          path: `/lesson/${currentUnit.track}/${currentUnit.level}/${currentUnit.unit.unit}`,
        }"
      >
        Continue
      </NuxtLink>
    </section>

    <section class="progress">
      <div class="progress__row">
        <span class="progress__label">Path</span>
        <span class="progress__value">
          {{ unitsDone }} of {{ allUnits.length }} units · {{ progressPercent }}%
        </span>
      </div>
      <div class="progress__bar">
        <div class="progress__fill" :style="{ width: `${progressPercent}%` }" />
      </div>
    </section>

    <section class="practice">
      <h2 class="practice__title">Practice</h2>
      <p class="practice__note">
        Items you have met come back on their own. Practise them whenever you like.
      </p>
      <div class="practice__actions">
        <NuxtLink class="practice__card" :class="{ 'practice__card--empty': dueItems.length === 0 }" to="/practice?mode=due">
          <span class="practice__count">{{ dueItems.length }}</span>
          <span class="practice__label">due back now</span>
        </NuxtLink>
        <NuxtLink class="practice__card" to="/practice?mode=weak">
          <span class="practice__count">{{ weakItems.length }}</span>
          <span class="practice__label">still shaky</span>
        </NuxtLink>
      </div>
    </section>

    <section v-for="track in tracks?.tracks ?? []" :key="track.id" class="track">
      <h2 class="track__title">{{ track.name }}</h2>

      <section v-for="level in track.levels" :key="level.level" class="level">
        <header class="level__header">
          <h3 class="level__name">
            <span class="level__code">{{ level.level }}</span>
            <span>{{ level.title }}</span>
          </h3>
          <p class="level__description">{{ level.description }}</p>
          <ul class="level__grammar">
            <li v-for="point in level.grammar" :key="point">{{ point }}</li>
          </ul>
        </header>

        <ul v-if="level.units.length > 0" class="units">
          <li v-for="unit in level.units" :key="unit.unit">
            <NuxtLink
              v-if="!unit.locked"
              class="unit"
              :class="{ 'unit--done': unit.completed }"
              :to="{ path: `/lesson/${track.id}/${level.level}/${unit.unit}` }"
            >
              <span class="unit__number">{{ unit.unit }}</span>
              <span class="unit__body">
                <span class="unit__name">{{ unit.title }}</span>
                <span class="unit__description">{{ unit.description }}</span>
              </span>
              <span class="unit__count">
                {{ unit.completed ? "done" : `${unit.exerciseCount} exercises` }}
              </span>
            </NuxtLink>

            <div v-else class="unit unit--locked" :title="`Finish the unit before this one`">
              <span class="unit__number">🔒</span>
              <span class="unit__body">
                <span class="unit__name">{{ unit.title }}</span>
                <span class="unit__description">Finish the unit before this one.</span>
              </span>
              <span class="unit__count">{{ unit.exerciseCount }} exercises</span>
            </div>
          </li>
        </ul>

        <p v-else class="level__empty">No units written yet.</p>
      </section>
    </section>

    <p v-if="(tracks?.tracks ?? []).length === 0" class="dashboard__empty">No content yet.</p>
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

.continue {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
}

.continue__body {
  display: grid;
  gap: 2px;
}

.continue__eyebrow {
  margin: 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-accent-strong);
  font-weight: 700;
}

.continue__title {
  font-size: 1.35rem;
}

.continue__note {
  margin: 0;
  color: var(--color-ink-soft);
}

.progress {
  margin-bottom: var(--space-4);
}

.progress__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--space-2);
}

.progress__label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-ink-soft);
}

.progress__value {
  font-size: 0.9rem;
  color: var(--color-ink-soft);
}

.progress__bar {
  height: 8px;
  border-radius: 999px;
  background: var(--color-line);
  overflow: hidden;
}

.progress__fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 200ms ease;
}

.practice {
  margin-bottom: var(--space-6);
  padding: var(--space-4);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-accent-soft);
}

.practice__title {
  font-size: 1.1rem;
}

.practice__note {
  margin: var(--space-1) 0 var(--space-3);
  color: var(--color-ink-soft);
  font-size: 0.92rem;
}

.practice__actions {
  display: flex;
  gap: var(--space-3);
}

.practice__card {
  display: grid;
  gap: 2px;
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  text-decoration: none;
  color: inherit;
  text-align: center;
}

.practice__card:hover {
  border-color: var(--color-accent);
}

.practice__card--empty {
  opacity: 0.7;
}

.practice__count {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-accent-strong);
}

.practice__label {
  font-size: 0.8rem;
  color: var(--color-ink-soft);
}

.track__title {
  font-size: 1.3rem;
  margin-bottom: var(--space-4);
}

.level {
  margin-bottom: var(--space-5);
  padding-left: var(--space-4);
  border-left: 3px solid var(--color-line);
}

.level__header {
  margin-bottom: var(--space-3);
}

.level__name {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: 1rem;
}

.level__code {
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
  border-radius: var(--radius-sm);
  padding: 2px var(--space-2);
  font-weight: 700;
  font-size: 0.85rem;
}

.level__description {
  margin: var(--space-1) 0 0;
  color: var(--color-ink-soft);
  font-size: 0.92rem;
}

.level__grammar {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-2) 0 0;
  padding: 0;
}

.level__grammar li {
  font-size: 0.78rem;
  color: var(--color-ink-soft);
  border: 1px solid var(--color-line);
  border-radius: 999px;
  padding: 2px var(--space-3);
}

.level__empty {
  color: var(--color-ink-soft);
  font-size: 0.9rem;
  margin: var(--space-2) 0 0;
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

.unit--done {
  background: var(--color-correct-soft);
}

.unit--locked {
  opacity: 0.55;
  cursor: not-allowed;
}

.unit--locked .unit__number {
  background: var(--color-line);
  color: var(--color-ink-soft);
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
