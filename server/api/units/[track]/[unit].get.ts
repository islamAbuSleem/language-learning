import { trackIdSchema } from "#shared/content/schema"

import { toClientExercise } from "../../../domain/exercise/presentation"
import { loadUnit } from "../../../services/contentService"

export default defineEventHandler(async (event) => {
  const track = trackIdSchema.safeParse(getRouterParam(event, "track"))
  const unit = Number(getRouterParam(event, "unit"))

  if (!track.success) {
    throw createError({ statusCode: 400, statusMessage: "Unknown track" })
  }
  if (!Number.isInteger(unit) || unit < 1) {
    throw createError({ statusCode: 400, statusMessage: "Unknown unit" })
  }

  const content = await loadUnit(track.data, unit)
  if (!content) {
    throw createError({ statusCode: 404, statusMessage: "Unit not found" })
  }

  return {
    track: content.track,
    unit: content.unit,
    title: content.title,
    description: content.description,
    exercises: content.exercises.map(toClientExercise),
  }
})
