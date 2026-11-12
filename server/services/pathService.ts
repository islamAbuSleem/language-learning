import type { TrackId } from "#shared/content/schema"

import { loadTrackLadder } from "./contentService"
import {
  describePath,
  type PathUnit,
  type UnitProgress,
} from "../domain/progress/unitProgress"
import { listItemStates } from "./progressService"

/**
 * The learner's place on the path.
 *
 * The state of every unit is recomputed from the item states every time, so
 * answering the last exercise of a unit opens the next one straight away,
 * and a unit the learner got wrong shows up as weak straight away too.
 */
export async function getPathProgress(
  track: TrackId,
  learnerId: string,
  now: number = Date.now(),
): Promise<UnitProgress[]> {
  const units = await getPathUnits(track)
  const states = await listItemStates(learnerId)
  const byItem = new Map(states.map((state) => [state.itemId, state]))

  return describePath(units, byItem, now)
}

/** The units of a track, in the order the learner meets them. */
export async function getPathUnits(track: TrackId): Promise<PathUnit[]> {
  const ladder = await loadTrackLadder(track)
  if (!ladder) return []

  return ladder.flatMap((level) =>
    level.units.map((unit) => ({
      level: level.level,
      unit: unit.unit,
      exerciseIds: unit.exercises.map((exercise) => exercise.id),
    })),
  )
}
