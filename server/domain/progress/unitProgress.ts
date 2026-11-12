import { PRACTICE_MASTERY_CEILING } from "#shared/srs/types"
import type { ItemState } from "#shared/srs/types"

/**
 * Where a unit sits in the learner's path.
 *
 * - `locked` — the unit before it is not finished, so it cannot be started.
 * - `current` — the unit the learner is on.
 * - `done` — finished, and answered well enough to leave alone.
 * - `weak` — finished, but answered badly enough to be worth another look.
 */
export type UnitStatus = "locked" | "current" | "done" | "weak"

/**
 * Below this, a finished unit is offered back to the learner.
 *
 * Eight right answers in ten is the line. It is deliberately forgiving: one
 * wrong answer in a unit of ten does not stop anybody moving on, it just
 * means the unit is worth another look later.
 */
export const UNIT_ACCURACY_FLOOR = 0.8

/** A unit of the path, as the progress code sees it. */
export interface PathUnit {
  level: string
  unit: number
  exerciseIds: string[]
}

/** What one unit is worth to one learner. */
export interface UnitProgress {
  level: string
  unit: number
  /** `level/unit`, e.g. `A0/1`. */
  key: string
  status: UnitStatus
  /** How many exercises the unit has. */
  total: number
  /** How many of them the learner has been shown. */
  answered: number
  /** Every exercise seen: the unit is finished. */
  completed: boolean
  /** Right answers over answers, 0..1. Null until the learner answers. */
  accuracy: number | null
  /** How many of the unit's words are still shaky. */
  shaky: number
  /** How many of the unit's words are due back now. */
  due: number
}

export function unitKey(level: string, unit: number): string {
  return `${level}/${unit}`
}

/**
 * What one unit is worth to the learner.
 *
 * "Seen" counts a skipped exercise: a skip is free, it shows the solution,
 * and it must not hold the path open. What counts as *seen* is therefore the
 * last time the item was presented, not the number of times it was answered.
 */
export function describeUnit(
  unit: PathUnit,
  states: ReadonlyMap<string, ItemState>,
  now: number,
): Omit<UnitProgress, "status"> {
  let answered = 0
  let attempts = 0
  let right = 0
  let shaky = 0
  let due = 0

  for (const id of unit.exerciseIds) {
    const state = states.get(id)
    if (!state) continue

    if (state.lastReviewedAt !== null) answered += 1

    attempts += state.reps
    right += state.reps - state.lapses

    if (state.mastery < PRACTICE_MASTERY_CEILING) {
      shaky += 1
      if (state.dueAt <= now) due += 1
    }
  }

  return {
    level: unit.level,
    unit: unit.unit,
    key: unitKey(unit.level, unit.unit),
    total: unit.exerciseIds.length,
    answered,
    completed: unit.exerciseIds.length > 0 && answered === unit.exerciseIds.length,
    accuracy: attempts > 0 ? right / attempts : null,
    shaky,
    due,
  }
}

/**
 * The whole path, in order, with the status of every unit.
 *
 * The path has no gaps: a unit opens when the one before it is finished, so
 * a learner who starts from nothing walks the ladder in order. A unit that
 * is finished can always be started again, which is how a weak unit gets
 * another look.
 */
export function describePath(
  units: readonly PathUnit[],
  states: ReadonlyMap<string, ItemState>,
  now: number,
): UnitProgress[] {
  const progress = units.map((unit) => describeUnit(unit, states, now))

  let previousComplete = true

  for (const entry of progress) {
    if (!previousComplete) {
      entry.status = "locked"
    } else if (!entry.completed) {
      entry.status = "current"
    } else if (entry.accuracy !== null && entry.accuracy < UNIT_ACCURACY_FLOOR) {
      entry.status = "weak"
    } else {
      entry.status = "done"
    }

    previousComplete = entry.completed
  }

  return progress
}

/** The progress of one unit, or null if it is not on the path. */
export function progressFor(
  progress: readonly UnitProgress[],
  level: string,
  unit: number,
): UnitProgress | null {
  const key = unitKey(level, unit)

  return progress.find((entry) => entry.key === key) ?? null
}

/**
 * The units worth another look, worst first.
 *
 * This is the revisit path: a unit the learner got wrong stays on the
 * dashboard until it is answered well.
 */
export function unitsToRevisit(progress: readonly UnitProgress[]): UnitProgress[] {
  return progress
    .filter((entry) => entry.status === "weak")
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
}
