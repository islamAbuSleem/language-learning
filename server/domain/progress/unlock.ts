/**
 * The path, and what is open.
 *
 * The path has no gaps: a unit opens when the one before it is finished, so
 * a learner who starts from nothing walks the whole ladder in order.
 *
 * "Finished" is deliberately forgiving: every exercise has been answered at
 * least once. A learner who struggled still moves on, and the practice node
 * brings the weak words back to them.
 */

export interface PathUnit {
  level: string
  unit: number
  exerciseIds: string[]
}

export interface UnitLock {
  /** `level/unit`, e.g. `A0/1`. */
  key: string
  completed: boolean
  locked: boolean
}

export function unitKey(level: string, unit: number): string {
  return `${level}/${unit}`
}

/**
 * The locks for a whole path, in order.
 *
 * The first unit is always open. Every later one needs the unit before it to
 * be complete.
 */
export function computeUnitLocks(
  units: readonly PathUnit[],
  answeredItemIds: ReadonlySet<string>,
): UnitLock[] {
  const locks: UnitLock[] = []
  let previousComplete = true

  for (const unit of units) {
    const completed =
      unit.exerciseIds.length > 0 &&
      unit.exerciseIds.every((id) => answeredItemIds.has(id))

    locks.push({
      key: unitKey(unit.level, unit.unit),
      completed,
      locked: !previousComplete,
    })

    previousComplete = completed
  }

  return locks
}

/** The lock for one unit, or null if the unit is not on the path. */
export function lockFor(
  locks: readonly UnitLock[],
  level: string,
  unit: number,
): UnitLock | null {
  const key = unitKey(level, unit)

  return locks.find((lock) => lock.key === key) ?? null
}
