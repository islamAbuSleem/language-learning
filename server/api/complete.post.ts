import { completeRequestSchema } from "#shared/api/schemas"

import { toClientExercise } from "../domain/exercise/presentation"
import { getEffectiveLearnerId } from "../services/learnerService"
import { recordExercise } from "../services/progressService"
import { currentExercise, getSession } from "../services/sessionService"

export default defineEventHandler(async (event) => {
  const body = completeRequestSchema.safeParse(await readBody(event))

  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid completion" })
  }

  const session = getSession(body.data.sessionId)
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: "Session not found" })
  }
  if (!session.pending) {
    throw createError({ statusCode: 409, statusMessage: "Nothing to complete" })
  }

  const exercise = currentExercise(session)
  if (!exercise) {
    throw createError({ statusCode: 409, statusMessage: "This lesson is already finished" })
  }

  const { item, profile } = await recordExercise(
    await getEffectiveLearnerId(event),
    exercise,
    session.pending.outcome,
    body.data.grade,
    Date.now(),
  )

  session.pending = null
  session.index += 1

  const next = currentExercise(session)

  return {
    index: session.index,
    done: next === null,
    exercise: next ? toClientExercise(next) : null,
    mastery: item.mastery,
    dueInDays: item.stability,
    profile,
    counts: session.counts,
  }
})
