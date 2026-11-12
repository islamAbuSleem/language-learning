import type { TrackId } from "#shared/content/schema"

import { levelAccuracy, streaks, type PracticeDay } from "../domain/progress/stats"
import type { UnitProgress } from "../domain/progress/unitProgress"
import { toIsoDate } from "../domain/srs/dates"
import { loadTrackLadder } from "./contentService"
import { getPathProgress } from "./pathService"
import { listItemStates, listPracticeDays } from "./progressService"

/** One level's worth of learning, as numbers. */
export interface LevelStats {
  level: string
  title: string
  units: number
  completed: number
  /** Right answers over answers, 0..1. Null until the learner answers there. */
  accuracy: number | null
}

/** How the learner is doing, in one payload. */
export interface LearnerStats {
  /** Words met: ten per finished unit, and every unit holds ten words. */
  wordsMet: number
  /** Words the track holds. */
  totalWords: number
  levels: LevelStats[]
  /** Days practised, oldest first. */
  days: PracticeDay[]
  currentStreak: number
  longestStreak: number
}

/**
 * The learner's stats.
 *
 * Everything is derived from the item states and the practice days every
 * time, so the numbers cannot drift away from what the learner did.
 */
export async function getLearnerStats(
  track: TrackId,
  learnerId: string,
  now: number = Date.now(),
): Promise<LearnerStats> {
  const [units, ladder, states, days] = await Promise.all([
    getPathProgress(track, learnerId, now),
    loadTrackLadder(track),
    listItemStates(learnerId),
    listPracticeDays(learnerId),
  ])

  const titles = new Map(
    (ladder ?? []).map((level) => [level.level, level.title] as const),
  )

  const byLevel = new Map<string, UnitProgress[]>()
  for (const unit of units) {
    byLevel.set(unit.level, [...(byLevel.get(unit.level) ?? []), unit])
  }

  const levels: LevelStats[] = [...byLevel.entries()].map(([level, entries]) => ({
    level,
    title: titles.get(level) ?? level,
    units: entries.length,
    completed: entries.filter((unit) => unit.completed).length,
    accuracy: levelAccuracy(level, states).accuracy,
  }))

  const completed = units.filter((unit) => unit.completed).length
  const runs = streaks(
    days.map((day) => day.day),
    toIsoDate(now),
  )

  return {
    wordsMet: completed * 10,
    totalWords: units.length * 10,
    levels,
    days,
    currentStreak: runs.current,
    longestStreak: runs.longest,
  }
}
