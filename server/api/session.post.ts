import { startSessionSchema } from "#shared/api/schemas"

import { toClientExercise } from "../domain/exercise/presentation"
import { loadUnit } from "../services/contentService"
import { getLearnerId } from "../services/learnerService"
import { getPathLocks } from "../services/pathService"
import { getProfile } from "../services/progressService"
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

  // The path has no gaps: a unit that is still locked cannot be started.
  const learnerId = getLearnerId(event)
  const locks = await getPathLocks(track, learnerId)
  const lock = locks.find((entry) => entry.key === `${level}/${unit}`)

  if (lock?.locked) {
    throw createError({
      statusCode: 409,
      statusMessage: "This unit is still locked. Finish the one before it.",
    })
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
    profile: await getProfile(learnerId),
  }
})
