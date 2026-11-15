import { cefrLevelSchema, trackIdSchema } from "#shared/content/schema"

import { toClientExercise } from "../../../../domain/exercise/presentation"
import { loadUnit, loadUnitWords } from "../../../../services/contentService"
import { getEffectiveLearnerId } from "../../../../services/learnerService"
import { getPathProgress } from "../../../../services/pathService"
import { listItemStates } from "../../../../services/progressService"
import { describeLearningProgress, errorGate } from "../../../../domain/progress/gate"
import { progressFor } from "../../../../domain/progress/unitProgress"

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

  // The account when signed in, the anonymous cookie otherwise: the same id
  // every other endpoint uses, so the page and the API always agree.
  const learnerId = await getEffectiveLearnerId(event)
  const progress = await getPathProgress(track.data, learnerId)
  const state = progressFor(progress, level.data, unit)

  // Where the learner should go instead: the first unit that is open.
  // A locked unit always has one, because locks chain from the start.
  const current = progress.find((entry) => entry.status === "current")
  const [currentLevel, currentUnit] = current?.key.split("/") ?? []

  // The gate: too much of what the learner has learned is still wrong, so the
  // path waits for those errors. It only holds a unit that has not been
  // started — nobody is pulled out of work they are already doing.
  const states = await listItemStates(learnerId)
  const learning = describeLearningProgress(states)
  const gate = errorGate(learning)
  const held = gate.held && (state?.answered ?? 0) === 0

  return {
    track: content.track,
    level: content.level,
    unit: content.unit,
    title: content.title,
    description: content.description,
    explanation: content.explanation ?? null,
    /** The Spanish words this unit teaches, so the lesson can paint them. */
    words: await loadUnitWords(track.data, level.data, unit),
    /** Where the learner should go instead: the first open unit, if any. */
    continueTo:
      currentLevel && currentUnit
        ? { track: track.data, level: currentLevel, unit: Number(currentUnit) }
        : null,
    locked: state?.status === "locked",
    /** Where the unit sits: locked, current, done or weak. */
    status: state?.status ?? "locked",
    /** Right answers over answers, 0..1. Null before the first answer. */
    accuracy: state?.accuracy ?? null,
    /** Words of this unit that are still shaky. */
    shaky: state?.shaky ?? 0,
    /** Misses of this unit that are still shaky: what a repair round asks. */
    repairable: state?.repairable ?? 0,
    /**
     * The gate: whether the path is waiting for the learner's errors, and
     * the numbers behind that wait.
     */
    gate: {
      held,
      errors: gate.errors,
      errorShare: gate.errorShare,
      ceiling: gate.ceiling,
      met: learning.met,
      message: gate.message,
    },
    exercises: content.exercises.map(toClientExercise),
  }
})
