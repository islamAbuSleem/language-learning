import { z } from "zod"

/**
 * Content schema, shared by the app, the API and the tests.
 *
 * Exercise content is data, never code: one schema, three tracks.
 * Lives in `shared/` so both sides of the app import the same definitions.
 */

export const trackIdSchema = z.enum(["es", "de", "en"])

export type TrackId = z.infer<typeof trackIdSchema>

export const selectExerciseSchema = z.object({
  id: z.string().min(1),
  type: z.literal("select"),
  prompt: z.string().min(1),
  /** Two to six options. The correct answer must be one of them. */
  options: z.array(z.string().min(1)).min(2).max(6),
  answer: z.string().min(1),
  /** The English gloss, shown next to the answer. */
  translation: z.string().min(1),
  /** A short grammar or usage note. */
  note: z.string().optional(),
})

export const matchExerciseSchema = z.object({
  id: z.string().min(1),
  type: z.literal("match"),
  prompt: z.string().min(1),
  pairs: z
    .array(
      z.object({
        left: z.string().min(1),
        right: z.string().min(1),
      }),
    )
    .min(2)
    .max(8),
  note: z.string().optional(),
})

export const typeInExerciseSchema = z.object({
  id: z.string().min(1),
  type: z.literal("type_in"),
  prompt: z.string().min(1),
  answer: z.string().min(1),
  /** Alternative spellings that are also correct. */
  acceptedAnswers: z.array(z.string().min(1)).default([]),
  translation: z.string().min(1),
  note: z.string().optional(),
})

export const listenExerciseSchema = z.object({
  id: z.string().min(1),
  type: z.literal("listen"),
  prompt: z.string().min(1),
  /** The word that is spoken. */
  answer: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  translation: z.string().min(1),
  note: z.string().optional(),
})

export const exerciseSchema = z.discriminatedUnion("type", [
  selectExerciseSchema,
  matchExerciseSchema,
  typeInExerciseSchema,
  listenExerciseSchema,
])

export type SelectExercise = z.infer<typeof selectExerciseSchema>
export type MatchExercise = z.infer<typeof matchExerciseSchema>
export type TypeInExercise = z.infer<typeof typeInExerciseSchema>
export type ListenExercise = z.infer<typeof listenExerciseSchema>
export type Exercise = z.infer<typeof exerciseSchema>
export type ExerciseType = Exercise["type"]

export const unitSchema = z
  .object({
    track: trackIdSchema,
    unit: z.number().int().positive(),
    title: z.string().min(1),
    description: z.string().min(1),
    exercises: z.array(exerciseSchema).min(1).max(20),
  })
  .superRefine((unit, ctx) => {
    const seenIds = new Set<string>()

    unit.exercises.forEach((exercise, index) => {
      if (seenIds.has(exercise.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["exercises", index, "id"],
          message: `Duplicate exercise id "${exercise.id}"`,
        })
      }
      seenIds.add(exercise.id)

      if (exercise.type === "select" || exercise.type === "listen") {
        if (!exercise.options.includes(exercise.answer)) {
          ctx.addIssue({
            code: "custom",
            path: ["exercises", index, "answer"],
            message: `Answer "${exercise.answer}" is not one of the options`,
          })
        }
      }

      if (exercise.type === "type_in") {
        const accepted = [exercise.answer, ...exercise.acceptedAnswers]
        if (accepted.some((value) => value.trim().length === 0)) {
          ctx.addIssue({
            code: "custom",
            path: ["exercises", index, "acceptedAnswers"],
            message: "An accepted answer is empty",
          })
        }
      }
    })
  })

export type Unit = z.infer<typeof unitSchema>
