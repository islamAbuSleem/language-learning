import { cefrLevelSchema, trackIdSchema } from "#shared/content/schema"

import { toClientExercise } from "../../../../domain/exercise/presentation"
import { loadUnit } from "../../../../services/contentService"
import { getLearnerId } from "../../../../services/learnerService"
import { getPathLocks } from "../../../../services/pathService"

export default defineEventHandler(async (event) => {
  const track = trackIdSchema.safeParse(getRouterParam(event, "track"))
  const level = cefrLevelSchema.safeParse(getRouterParam(event, "level"))
  const unit = Number(getRouterParam(event, "unit"))

  if (!track.success) {
    throw createError({ statusCode: 400, statusMessage: "Unknown track" })
  }
  if (!level.success) {
    throw createError({ statusCode: 400, statusMessage: "Unknown level" })
  }
  if (!Number.isInteger(unit) || unit < 1) {
    throw createError({ statusCode: 400, statusMessage: "Unknown unit" })
  }

  const content = await loadUnit(track.data, level.data, unit)
  if (!content) {
    throw createError({ statusCode: 404, statusMessage: "Unit not found" })
  }

  const locks = await getPathLocks(track.data, getLearnerId(event))
  const lock = locks.find((entry) => entry.key === `${level.data}/${unit}`)

  return {
    track: content.track,
    level: content.level,
    unit: content.unit,
    title: content.title,
    description: content.description,
    explanation: content.explanation ?? null,
    locked: lock?.locked ?? false,
    exercises: content.exercises.map(toClientExercise),
  }
})
