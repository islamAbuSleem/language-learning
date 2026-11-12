import { answerRequestSchema } from "#shared/api/schemas"

import { correctAnswerLabel, gradeExercise } from "../domain/exercise/grading"
import { getSession, currentExercise } from "../services/sessionService"

export default defineEventHandler(async (event) => {
  const body = answerRequestSchema.safeParse(await readBody(event))

  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid answer" })
  }

  const session = getSession(body.data.sessionId)
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: "Session not found" })
  }

  const exercise = currentExercise(session)
  if (!exercise) {
    throw createError({ statusCode: 409, statusMessage: "This lesson is already finished" })
  }
  if (session.pending) {
    throw createError({ statusCode: 409, statusMessage: "This exercise is already answered" })
  }

  const outcome = gradeExercise(exercise, body.data.response)

  session.pending = { exerciseId: exercise.id, outcome }
  session.counts[outcome] += 1

  return {
    outcome,
    correctAnswer: correctAnswerLabel(exercise),
    translation: exercise.type === "match" ? null : exercise.translation,
    note: exercise.note ?? null,
  }
})
