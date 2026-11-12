import type { ClientExercise } from "#shared/api/schemas"
import type { Exercise } from "#shared/content/schema"

/**
 * Strip an exercise down to what the learner may see before answering.
 *
 * The solution, the translation and the note stay on the server: the client
 * renders the question and the server decides whether the answer was right.
 */
export function toClientExercise(exercise: Exercise): ClientExercise {
  switch (exercise.type) {
    case "select":
      return {
        id: exercise.id,
        type: "select",
        prompt: exercise.prompt,
        options: exercise.options,
      }
    case "listen":
      return {
        id: exercise.id,
        type: "listen",
        prompt: exercise.prompt,
        options: exercise.options,
        audio: exercise.audio,
      }
    case "match":
      return {
        id: exercise.id,
        type: "match",
        prompt: exercise.prompt,
        pairs: exercise.pairs,
      }
    case "type_in":
      return {
        id: exercise.id,
        type: "type_in",
        prompt: exercise.prompt,
      }
  }
}
