import { z } from "zod"

import { toClientExercise } from "../domain/exercise/presentation"
import { selectPracticeItems, selectWeakItems } from "../domain/srs"
import { findExercise } from "../services/contentService"
import { getLearnerId } from "../services/learnerService"
import { getProfile, listItemStates } from "../services/progressService"
import { createSession, currentExercise } from "../services/sessionService"

/**
 * A practice session.
 *
 * This is the loop the whole SRS exists for: items the learner has met come
 * back, either because they are due or because they are still weak.
 */
const practiceRequestSchema = z.object({
  /** `due` follows the schedule, `weak` follows the mastery. */
  mode: z.enum(["due", "weak"]),
  count: z.number().int().min(1).max(20).default(10),
})

export default defineEventHandler(async (event) => {
  const body = practiceRequestSchema.safeParse(await readBody(event).catch(() => ({})))

  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid practice request" })
  }

  const { mode, count } = body.data
  const learnerId = getLearnerId(event)
  const now = Date.now()

  const states = await listItemStates(learnerId)
  const due = selectPracticeItems(states, count, now)
  const weak = selectWeakItems(states, count)
  const picked = mode === "due" ? due : weak

  const exercises = (
    await Promise.all(picked.map((state) => findExercise(state.itemId)))
  ).filter((exercise) => exercise !== null)

  if (exercises.length === 0) {
    return {
      sessionId: null,
      mode,
      total: 0,
      index: 0,
      exercise: null,
      dueCount: due.length,
      weakCount: weak.length,
      profile: await getProfile(learnerId),
    }
  }

  const session = createSession("es", 0, exercises, now, "practice")
  const exercise = currentExercise(session)

  return {
    sessionId: session.id,
    mode,
    total: exercises.length,
    index: session.index,
    exercise: exercise ? toClientExercise(exercise) : null,
    dueCount: due.length,
    weakCount: weak.length,
    profile: await getProfile(learnerId),
  }
})
