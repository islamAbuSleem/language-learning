<script setup lang="ts">
import AppIcon from "~/components/AppIcon.vue"

interface LevelStats {
  level: string
  title: string
  units: number
  completed: number
  accuracy: number | null
}

interface PracticeDay {
  day: string
  answers: number
  correct: number
  xp: number
}

interface LearnerStats {
  wordsMet: number
  totalWords: number
  levels: LevelStats[]
  days: PracticeDay[]
  currentStreak: number
  longestStreak: number
}

const { data: stats } = await useFetch<LearnerStats>("/api/stats/es", {
  headers: useRequestHeaders(["cookie"]),
})

/** The last eight weeks, oldest first, as a calendar grid. */
const weeks = computed(() => {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // Start on a Monday eight weeks back.
  const start = new Date(today)
  const back = ((start.getUTCDay() + 6) % 7) + 7 * 7
  start.setUTCDate(start.getUTCDate() - back)

  const practised = new Map(
    (stats.value?.days ?? []).map((day) => [day.day, day]),
  )

  const cells: { date: Date; key: string; day: PracticeDay | null; future: boolean }[] = []
  const cursor = new Date(start)

  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10)
    cells.push({
      date: new Date(cursor),
      key,
      day: practised.get(key) ?? null,
      future: false,
    })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  const result: (typeof cells)[] = []
  for (let week = 0; week < cells.length; week += 7) {
    result.push(cells.slice(week, week + 7))
  }

  return result
})

const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"]

function accuracyLabel(accuracy: number | null): string {
  if (accuracy === null) return "not started"
  return `${Math.round(accuracy * 100)}% right`
}
</script>

<template>
  <main class="progress-page">
    <header class="progress-page__header">
      <NuxtLink class="lesson__back" to="/"><AppIcon name="back" /> Learn</NuxtLink>
      <h1 class="progress-page__title">Your progress</h1>
      <p class="progress-page__note">What you have done, not where you are.</p>
    </header>

    <section class="stat-row">
      <div class="stat">
        <span class="stat__value">{{ stats?.wordsMet ?? 0 }}</span>
        <span class="stat__label">words met, of {{ stats?.totalWords ?? 0 }}</span>
      </div>
      <div class="stat">
        <span class="stat__value">{{ stats?.currentStreak ?? 0 }}</span>
        <span class="stat__label">day streak</span>
      </div>
      <div class="stat">
        <span class="stat__value">{{ stats?.longestStreak ?? 0 }}</span>
        <span class="stat__label">longest streak</span>
      </div>
    </section>

    <section class="levels">
      <h2 class="levels__title">By level</h2>
      <ul class="levels__list">
        <li v-for="level in stats?.levels ?? []" :key="level.level" class="level-stat">
          <span class="level-stat__code">{{ level.level }}</span>
          <span class="level-stat__body">
            <span class="level-stat__name">{{ level.title }}</span>
            <span class="level-stat__detail">
              {{ level.completed }} of {{ level.units }} units · {{ accuracyLabel(level.accuracy) }}
            </span>
          </span>
          <span class="level-stat__bar" aria-hidden="true">
            <span
              class="level-stat__fill"
              :style="{ width: `${level.accuracy === null ? 0 : Math.round(level.accuracy * 100)}%` }"
            />
          </span>
        </li>
      </ul>
    </section>

    <section class="calendar">
      <h2 class="calendar__title">The last eight weeks</h2>
      <p class="calendar__note">A filled day is a day you showed up.</p>
      <div class="calendar__grid" role="img" aria-label="Practice calendar for the last eight weeks">
        <div class="calendar__weekdays" aria-hidden="true">
          <span v-for="(label, index) in weekdayLabels" :key="index">{{ label }}</span>
        </div>
        <div v-for="(week, index) in weeks" :key="index" class="calendar__week">
          <span
            v-for="cell in week"
            :key="cell.key"
            class="calendar__day"
            :class="{ 'calendar__day--done': cell.day !== null }"
            :title="cell.day ? `${cell.key}: ${cell.day.answers} answered` : cell.key"
          />
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.progress-page {
  max-width: 760px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4) var(--space-7);
  display: grid;
  gap: var(--space-6);
}

.lesson__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-ink-soft);
  text-decoration: none;
  white-space: nowrap;
  font-weight: 600;
  font-size: 0.92rem;
}

.lesson__back:hover {
  color: var(--color-ink);
}

.progress-page__title {
  font-family: var(--font-display);
  font-size: clamp(1.9rem, 1.5rem + 2.5vw, 2.5rem);
  line-height: 1.08;
  font-weight: 400;
  margin-top: var(--space-3);
}

.progress-page__note {
  margin: var(--space-1) 0 0;
  color: var(--color-ink-soft);
  max-width: 65ch;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: var(--space-3);
}

.stat {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-line);
  background: var(--color-surface);
}

.stat__value {
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1;
  color: var(--color-accent);
}

.stat__label {
  color: var(--color-ink-soft);
  font-size: 0.85rem;
}

.levels__title,
.calendar__title {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  margin-bottom: var(--space-3);
}

.levels__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-2);
}

.level-stat {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    "code body"
    "code bar";
  gap: var(--space-1) var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-line);
  background: var(--color-surface);
}

.level-stat__code {
  grid-area: code;
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

.level-stat__body {
  grid-area: body;
  display: grid;
  gap: 2px;
  min-width: 0;
}

.level-stat__name {
  font-weight: 700;
}

.level-stat__detail {
  font-size: 0.85rem;
  color: var(--color-ink-soft);
}

.level-stat__bar {
  grid-area: bar;
  height: 6px;
  border-radius: 999px;
  background: var(--color-line);
  overflow: hidden;
}

.level-stat__fill {
  display: block;
  height: 100%;
  background: var(--color-accent);
  border-radius: 999px;
  transition: width 200ms ease;
}

.calendar__note {
  margin: 0 0 var(--space-3);
  color: var(--color-ink-soft);
  font-size: 0.92rem;
}

.calendar__grid {
  display: grid;
  gap: var(--space-2);
}

.calendar__weekdays,
.calendar__week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-2);
}

.calendar__weekdays {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-ink-soft);
  text-align: center;
}

.calendar__day {
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-line);
  background: var(--color-surface);
}

.calendar__day--done {
  background: var(--color-accent);
  border-color: var(--color-accent);
}
</style>
