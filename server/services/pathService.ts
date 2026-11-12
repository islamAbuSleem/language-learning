import type { TrackId } from "#shared/content/schema"

import { loadTrackLadder } from "./contentService"
import { computeUnitLocks, type UnitLock } from "../domain/progress/unlock"
import { listItemStates } from "./progressService"

/**
 * The learner's place on the path.
 *
 * The locks are recomputed from the item states every time, so answering the
 * last exercise of a unit opens the next one straight away.
 */
export async function getPathLocks(
  track: TrackId,
  learnerId: string,
): Promise<UnitLock[]> {
  const ladder = await loadTrackLadder(track)
  if (!ladder) return []

  const units = ladder.flatMap((level) =>
    level.units.map((unit) => ({
      level: level.level,
      unit: unit.unit,
      exerciseIds: unit.exercises.map((exercise) => exercise.id),
    })),
  )

  const states = await listItemStates(learnerId)
  const answered = new Set(states.filter((state) => state.reps > 0).map((state) => state.itemId))

  return computeUnitLocks(units, answered)
}
