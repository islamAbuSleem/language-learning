import type { Exercise, ExerciseType } from "#shared/content/schema"
import type { ExerciseOutcome } from "../srs/types"

/**
 * What the learner did with one exercise.
 *
 * `skip` is a first-class answer: skipping costs no heart, reveals the solution
 * and brings the item straight back.
 */
export type ExerciseResponse =
  | { kind: "choice"; value: string }
  | { kind: "match"; pairs: { left: string; right: string }[] }
  | { kind: "text"; value: string }
  | { kind: "skip" }

export function responseKindFor(exerciseType: ExerciseType): ExerciseResponse["kind"] {
  switch (exerciseType) {
    case "select":
    case "listen":
      return "choice"
    case "match":
      return "match"
    case "type_in":
      return "text"
  }
}

/**
 * Fold accents, case and punctuation so "cafe" and "Café." are both accepted.
 * A language app that rejects a correct answer for a missing accent teaches the
 * wrong lesson.
 */
export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,!?;:¡¿]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function isMatchCorrect(
  exercise: Extract<Exercise, { type: "match" }>,
  response: Extract<ExerciseResponse, { kind: "match" }>,
): boolean {
  if (response.pairs.length !== exercise.pairs.length) return false

  const expected = new Map(
    exercise.pairs.map((pair) => [normalizeAnswer(pair.left), normalizeAnswer(pair.right)]),
  )

  return response.pairs.every((pair) => {
    const right = expected.get(normalizeAnswer(pair.left))
    return right !== undefined && right === normalizeAnswer(pair.right)
  })
}

function isTextCorrect(
  exercise: Extract<Exercise, { type: "type_in" }>,
  response: Extract<ExerciseResponse, { kind: "text" }>,
): boolean {
  const given = normalizeAnswer(response.value)
  if (given.length === 0) return false

  const accepted = [exercise.answer, ...exercise.acceptedAnswers].map(normalizeAnswer)
  return accepted.includes(given)
}

export function gradeExercise(exercise: Exercise, response: ExerciseResponse): ExerciseOutcome {
  if (response.kind === "skip") return "skipped"

  switch (exercise.type) {
    case "select":
    case "listen":
      if (response.kind !== "choice") return "incorrect"
      return normalizeAnswer(response.value) === normalizeAnswer(exercise.answer)
        ? "correct"
        : "incorrect"

    case "match":
      if (response.kind !== "match") return "incorrect"
      return isMatchCorrect(exercise, response) ? "correct" : "incorrect"

    case "type_in":
      if (response.kind !== "text") return "incorrect"
      return isTextCorrect(exercise, response) ? "correct" : "incorrect"
  }
}

/** The solution shown in the feedback panel. */
export function correctAnswerLabel(exercise: Exercise): string {
  switch (exercise.type) {
    case "select":
    case "listen":
    case "type_in":
      return exercise.answer
    case "match":
      return exercise.pairs.map((pair) => `${pair.left} → ${pair.right}`).join(" · ")
  }
}
