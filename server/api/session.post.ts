import { startSessionSchema } from "#shared/api/schemas"

import { toClientExercise } from "../domain/exercise/presentation"
import { loadUnit } from "../services/contentService"
import { currentLearnerId, getProfile } from "../services/progressService"
import { createSession, currentExercise } from "../services/sessionService"

export default defineEventHandler(async (event) => {
  const body = startSessionSchema.safeParse(await readBody(event))

  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid session request" })
  }

  const { track, level, unit } = body.data
  const content = await loadUnit(track, level, unit)

  if (!content) {
    throw createError({ statusCode: 404, statusMessage: "Unit not found" })
  }

  const now = Date.now()
  const session = createSession(track, unit, content.exercises, now)
  const exercise = currentExercise(session)

  return {
    sessionId: session.id,
    track,
    level,
    unit,
    total: content.exercises.length,
    index: session.index,
    exercise: exercise ? toClientExercise(exercise) : null,
    profile: getProfile(currentLearnerId()),
  }
})
