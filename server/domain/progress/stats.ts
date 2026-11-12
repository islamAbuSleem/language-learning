import type { ItemState } from "#shared/srs/types"

import { isYesterday } from "../srs/dates"

/**
 * How a level is going.
 *
 * Accuracy is right answers over answers, over every attempt at the level's
 * exercises. Null until the learner answers something there.
 */
export interface LevelAccuracy {
  level: string
  answered: number
  attempts: number
  accuracy: number | null
}

/**
 * Right answers over answers for one level's worth of items.
 *
 * The level comes from the item id itself (`es/a1/u1/...`), so this needs
 * no content lookup. Items that belong to another level are ignored.
 */
export function levelAccuracy(
  level: string,
  states: readonly ItemState[],
): LevelAccuracy {
  const wanted = level.toLowerCase()
  let answered = 0
  let attempts = 0
  let right = 0

  for (const state of states) {
    const parts = state.itemId.split("/")
    if (parts.length < 2 || parts[1]?.toLowerCase() !== wanted) continue

    if (state.lastReviewedAt !== null) answered += 1

    attempts += state.reps
    right += state.reps - state.lapses
  }

  return {
    level,
    answered,
    attempts,
    accuracy: attempts > 0 ? right / attempts : null,
  }
}

/** A streak as the calendar sees it. */
export interface Streaks {
  /** Consecutive days up to today (or yesterday, if today is still blank). */
  current: number
  /** The longest unbroken run ever. */
  longest: number
}

/**
 * Streaks from the days the learner practised.
 *
 * Days are `YYYY-MM-DD` in UTC, oldest first or not — they are sorted here.
 * A day counts on its own; only consecutive days extend a run.
 */
export function streaks(days: readonly string[], today: string): Streaks {
  const unique = [...new Set(days)].sort()
  if (unique.length === 0) return { current: 0, longest: 0 }

  let longest = 1
  let run = 1
  // The run that is still alive: consecutive days ending in `today`.
  let current = 0

  for (let index = 1; index <= unique.length; index += 1) {
    const previous = unique[index - 1]!
    const next = unique[index]

    if (next !== undefined && isYesterday(previous, next)) {
      run += 1
    } else {
      if (run > longest) longest = run
      // A run counts as current when it reaches today, or stops yesterday
      // (today may still be blank when the learner opens the app).
      if (previous === today || isYesterday(previous, today)) current = run
      run = 1
    }
  }

  return { current, longest }
}
