import { startSessionSchema } from "#shared/api/schemas"

import { toClientExercise } from "../domain/exercise/presentation"
import { describeLearningProgress, errorGate } from "../domain/progress/gate"
import { progressFor } from "../domain/progress/unitProgress"
import { selectRepairStates } from "../domain/srs"
import { loadUnit } from "../services/contentService"
import { getEffectiveLearnerId } from "../services/learnerService"
import { getPathProgress } from "../services/pathService"
import { getProfile, listItemStates } from "../services/progressService"
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

  // The path has no gaps: a unit that is still locked cannot be started. A
  // unit that is finished can be started again, which is how a weak unit gets
  // another look.
  const learnerId = await getEffectiveLearnerId(event)
  const progress = await getPathProgress(track, learnerId)
  const state = progressFor(progress, level, unit)

  if (state?.status === "locked") {
    throw createError({
      statusCode: 409,
      statusMessage: "This unit is still locked. Finish the one before it.",
    })
  }

  // The gate: while too much of what the learner has learned is still wrong,
  // the path waits for those errors. A unit already started is never held
  // back — the learner is mid-work, and a wall there would be a dead end.
  const states = await listItemStates(learnerId)
  const learning = describeLearningProgress(states)
  const gate = errorGate(learning)
  const notStarted = (state?.answered ?? 0) === 0

  if (notStarted && gate.held && body.data.scope !== "repair") {
    throw createError({
      statusCode: 409,
      statusMessage: gate.message,
      data: { gate, learning },
    })
  }

  const now = Date.now()

  // A repair asks only the misses that are still shaky, weakest first — the
  // short way back for a unit answered badly. Anything the learner has
  // already made solid needs no repair.
  let exercises = content.exercises
  let kind = "unit" as const
  if (body.data.scope === "repair") {
    const picked = selectRepairStates(
      content.exercises.map((exercise) => exercise.id),
      states,
      10,
    )

    if (picked.length === 0) {
      throw createError({
        statusCode: 409,
        statusMessage: "Nothing to fix in this unit right now.",
      })
    }

    const order = new Map(picked.map((item, index) => [item.itemId, index] as const))
    exercises = content.exercises
      .filter((exercise) => order.has(exercise.id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    kind = "repair"
  }

  const session = createSession(track, unit, exercises, now, kind)
  const exercise = currentExercise(session)

  return {
    sessionId: session.id,
    track,
    level,
    unit,
    total: exercises.length,
    index: session.index,
    exercise: exercise ? toClientExercise(exercise) : null,
    profile: await getProfile(learnerId),
    /** `current` for a new unit, `done` or `weak` when the learner comes back. */
    status: state?.status ?? "current",
  }
})
