<script setup lang="ts">
import type { ItemProgressPayload, LearnerProfilePayload } from "#shared/api/schemas"
import { PRACTICE_MASTERY_CEILING } from "#shared/srs/types"

import AppIcon from "~/components/AppIcon.vue"

/** Where a unit sits in the learner's path. */
type UnitStatus = "locked" | "current" | "done" | "weak"

interface UnitSummary {
  unit: number
  title: string
  description: string
  exerciseCount: number
  completed: boolean
  locked: boolean
  status: UnitStatus
  accuracy: number | null
  answered: number
  shaky: number
}

interface LevelSummary {
  level: string
  title: string
  description: string
  grammar: string[]
  units: UnitSummary[]
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

interface PathUnit {
  track: string
  level: string
  unit: UnitSummary
}

/** Every unit of every track, in the order the learner meets them. */
const allUnits = computed<PathUnit[]>(() => {
  const units: PathUnit[] = []

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
const currentUnit = computed(() => allUnits.value.find((entry) => entry.unit.status === "current") ?? null)

/**
 * The units worth another look.
 *
 * A unit is finished when every exercise has been seen, but finished is not
 * the same as learned: a unit the learner got wrong stays on the dashboard
 * until they answer it well.
 */
const revisitUnits = computed(() =>
  allUnits.value
    .filter((entry) => entry.unit.status === "weak")
    .sort((a, b) => (a.unit.accuracy ?? 0) - (b.unit.accuracy ?? 0)),
)

const unitsDone = computed(() => allUnits.value.filter((entry) => entry.unit.completed).length)

const progressPercent = computed(() => {
  const total = allUnits.value.length
  if (total === 0) return 0

  return Math.round((unitsDone.value / total) * 100)
})

/** The level the learner is working in, so it opens by itself. */
const currentLevel = computed(() => {
  if (currentUnit.value) return currentUnit.value.level

  const levels = tracks.value?.tracks ?? []
  const last = levels[levels.length - 1]

  return last?.levels[last.levels.length - 1]?.level ?? ""
})

/** How many units of a level are finished. */
function doneIn(level: LevelSummary): number {
  return level.units.filter((unit) => unit.completed).length
}

/** The label on the right of a unit, which says what state it is in. */
function unitLabel(unit: UnitSummary): string {
  if (unit.status === "done") return "done"
  if (unit.status === "weak") return `${Math.round((unit.accuracy ?? 0) * 100)}% · redo`
  if (unit.status === "current") return `${unit.exerciseCount} exercises`

  return `${unit.exerciseCount} exercises`
}
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

    <section v-else-if="allUnits.length > 0" class="continue continue--finished">
      <div class="continue__body">
        <p class="continue__eyebrow">The whole path</p>
        <h2 class="continue__title">Finished</h2>
        <p class="continue__note">
          You have been through every unit. Keep the words alive with a practice round.
        </p>
      </div>
      <NuxtLink class="btn btn--primary" to="/practice?mode=weak">Practise</NuxtLink>
    </section>

    <section class="progress" aria-label="Path progress">
      <div class="progress__row">
        <span class="progress__label">Path</span>
        <span class="progress__value">
          {{ unitsDone }} of {{ allUnits.length }} units · {{ progressPercent }}%
        </span>
      </div>
      <div
        class="progress__bar"
        role="progressbar"
        :aria-valuenow="progressPercent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="progress__fill" :style="{ width: `${progressPercent}%` }" />
      </div>
    </section>

    <section v-if="revisitUnits.length > 0" class="review">
      <h2 class="review__title">Worth another look</h2>
      <p class="review__note">
        You finished these units, but some of the answers were wrong. Do one again
        whenever you like.
      </p>
      <ul class="review__list">
        <li v-for="entry in revisitUnits" :key="`${entry.track}-${entry.level}-${entry.unit.unit}`">
          <NuxtLink
            class="review__unit"
            :to="{
              path: `/lesson/${entry.track}/${entry.level}/${entry.unit.unit}`,
            }"
          >
            <span class="review__body">
              <span class="review__eyebrow">
                {{ entry.level }} · Unit {{ entry.unit.unit }}
              </span>
              <span class="review__name">{{ entry.unit.title }}</span>
            </span>
            <span class="review__score">{{ Math.round((entry.unit.accuracy ?? 0) * 100) }}%</span>
          </NuxtLink>
        </li>
      </ul>
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

      <details
        v-for="level in track.levels"
        :key="level.level"
        class="level"
        :open="level.level === currentLevel"
      >
        <summary class="level__header">
          <h3 class="level__name">
            <span class="level__code">{{ level.level }}</span>
            <span>{{ level.title }}</span>
          </h3>
          <p class="level__description">{{ level.description }}</p>
          <p class="level__count">{{ doneIn(level) }} of {{ level.units.length }} units</p>
        </summary>

        <ul class="level__grammar">
          <li v-for="point in level.grammar" :key="point">{{ point }}</li>
        </ul>

        <ul v-if="level.units.length > 0" class="units">
          <li v-for="unit in level.units" :key="unit.unit">
            <NuxtLink
              v-if="unit.status !== 'locked'"
              class="unit"
              :class="{
                'unit--done': unit.status === 'done',
                'unit--weak': unit.status === 'weak',
                'unit--current': unit.status === 'current',
              }"
              :to="{ path: `/lesson/${track.id}/${level.level}/${unit.unit}` }"
            >
              <span class="unit__number">
                <AppIcon v-if="unit.status === 'done'" name="check" />
                <template v-else>{{ unit.unit }}</template>
              </span>
              <span class="unit__body">
                <span class="unit__name">{{ unit.title }}</span>
                <span class="unit__description">{{ unit.description }}</span>
              </span>
              <span class="unit__count">{{ unitLabel(unit) }}</span>
            </NuxtLink>

            <div v-else class="unit unit--locked" :title="`Finish the unit before this one`">
              <span class="unit__number"><AppIcon name="lock" /></span>
              <span class="unit__body">
                <span class="unit__name">{{ unit.title }}</span>
                <span class="unit__description">Finish the unit before this one.</span>
              </span>
              <span class="unit__count">{{ unit.exerciseCount }} exercises</span>
            </div>
          </li>
        </ul>

        <p v-else class="level__empty">No units written yet.</p>
      </details>
    </section>

    <p v-if="(tracks?.tracks ?? []).length === 0" class="dashboard__empty">No content yet.</p>
  </main>
</template>

<style scoped>
.dashboard {
  max-width: 760px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4) var(--space-7);
}

.dashboard__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
}

.dashboard__title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.dashboard__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--color-ink-soft);
  font-size: 0.95rem;
}

.dashboard__empty {
  color: var(--color-ink-soft);
}

.chips {
  display: flex;
  gap: var(--space-2);
  margin: 0;
}

.chip {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  text-align: center;
  min-width: 4.5rem;
}

.chip dt {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-ink-soft);
}

.chip dd {
  margin: var(--space-1) 0 0;
  font-size: 1.25rem;
  font-weight: 800;
}

/* The one display moment: the unit you are on, set large. */
.continue {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  flex-wrap: wrap;
  margin-bottom: var(--space-5);
  padding: var(--space-5) var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
}

.continue--finished {
  border-color: var(--color-accent);
}

.continue__body {
  display: grid;
  gap: var(--space-1);
  min-width: min(100%, 28rem);
}

.continue__eyebrow {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-accent);
}

.continue__title {
  font-family: var(--font-display);
  font-size: clamp(1.7rem, 1.3rem + 2vw, 2.2rem);
  line-height: 1.1;
  font-weight: 400;
}

.continue__note {
  margin: 0;
  color: var(--color-ink-soft);
  max-width: 65ch;
}

.progress {
  margin-bottom: var(--space-5);
}

.progress__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.progress__label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
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
  border-radius: 999px;
  transition: width 200ms ease;
}

.review {
  margin-bottom: var(--space-5);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
}

.review__title {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.review__note {
  margin: var(--space-1) 0 var(--space-3);
  color: var(--color-ink-soft);
  font-size: 0.92rem;
  max-width: 65ch;
}

.review__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-2);
}

.review__unit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-line);
  background: var(--color-surface-soft);
  text-decoration: none;
}

.review__unit:hover {
  border-color: var(--color-accent);
}

.review__body {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.review__eyebrow {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-ink-soft);
}

.review__name {
  font-weight: 700;
}

.review__score {
  font-weight: 800;
  color: var(--color-accent);
}

.practice {
  margin-bottom: var(--space-6);
}

.practice__title {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.practice__note {
  margin: var(--space-1) 0 var(--space-3);
  color: var(--color-ink-soft);
  font-size: 0.92rem;
  max-width: 65ch;
}

.practice__actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: var(--space-3);
}

.practice__card {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  text-decoration: none;
}

.practice__card:hover {
  border-color: var(--color-accent);
}

.practice__card--empty {
  background: var(--color-surface-soft);
}

.practice__card--empty .practice__count {
  color: var(--color-ink-soft);
}

.practice__count {
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1;
  color: var(--color-accent);
}

.practice__label {
  color: var(--color-ink-soft);
  font-size: 0.85rem;
}

.track {
  margin-bottom: var(--space-6);
}

.track__title {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  margin-bottom: var(--space-3);
}

.level {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
  background: var(--color-surface);
  overflow: clip;
}

.level[open] {
  border-color: var(--color-line-strong);
}

.level__header {
  padding: var(--space-4);
  cursor: pointer;
  list-style: none;
}

.level__header::-webkit-details-marker {
  display: none;
}

.level__header::before {
  content: "";
  float: right;
  width: 0.55rem;
  height: 0.55rem;
  margin-top: 0.45rem;
  border-right: 2px solid var(--color-ink-soft);
  border-bottom: 2px solid var(--color-ink-soft);
  transform: rotate(45deg);
  transition: transform 140ms ease;
}

.level[open] .level__header::before {
  transform: rotate(-135deg);
  margin-top: 0.7rem;
}

.level__name {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.level__code {
  display: inline-grid;
  place-items: center;
  min-width: 2rem;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.level__description {
  margin: var(--space-2) 0 0;
  color: var(--color-ink-soft);
  font-size: 0.9rem;
  max-width: 65ch;
}

.level__count {
  margin: var(--space-2) 0 0;
  font-size: 0.8rem;
  color: var(--color-ink-soft);
}

.level__grammar {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0 var(--space-4) var(--space-3);
}

.level__grammar li {
  font-size: 0.75rem;
  padding: 2px var(--space-2);
  border-radius: 999px;
  border: 1px solid var(--color-line);
  color: var(--color-ink-soft);
  background: var(--color-surface-soft);
}

.level__empty {
  margin: 0;
  padding: 0 var(--space-4) var(--space-4);
  color: var(--color-ink-soft);
}

.units {
  list-style: none;
  margin: 0;
  padding: 0 var(--space-2) var(--space-2);
  display: grid;
  gap: 2px;
}

.unit {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: inherit;
}

a.unit:hover {
  background: var(--color-surface-soft);
}

.unit--current {
  background: var(--color-accent-soft);
}

.unit--current:hover,
a.unit--current:hover {
  background: var(--color-accent-soft);
}

.unit__number {
  width: 2rem;
  height: 2rem;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid var(--color-line-strong);
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 800;
}

.unit--done .unit__number {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-on-accent);
}

.unit--current .unit__number {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-on-accent);
}

.unit--weak .unit__number {
  background: var(--color-gold-soft);
  border-color: var(--color-gold-strong);
  color: var(--color-gold-strong);
}

.unit__body {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.unit__name {
  font-weight: 700;
}

.unit__description {
  font-size: 0.85rem;
  color: var(--color-ink-soft);
}

.unit__count {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--color-ink-soft);
  white-space: nowrap;
}

.unit--weak .unit__count {
  color: var(--color-accent);
  font-weight: 800;
}

.unit--locked .unit__description {
  color: var(--color-ink-soft);
}

@media (max-width: 560px) {
  .dashboard {
    padding-top: var(--space-4);
  }

  .continue {
    padding: var(--space-4);
  }

  .unit__description {
    display: none;
  }
}
</style>
