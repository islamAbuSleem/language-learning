import { z } from "zod"

/**
 * Content schema, shared by the app, the API and the tests.
 *
 * Exercise content is data, never code: one schema, three tracks.
 * Lives in `shared/` so both sides of the app import the same definitions.
 */

export const trackIdSchema = z.enum(["es", "de", "en"])

export type TrackId = z.infer<typeof trackIdSchema>

/**
 * The levels our path is built on.
 *
 * CEFR levels, the standard scale for language competence. A learner walks
 * A0 → A1 → A2 → B1 → B2; each level holds units, each unit holds exercises.
 *
 * A0 is the pre-level: greetings and the first questions, for someone who
 * has never studied the language.
 */
export const cefrLevelSchema = z.enum(["A0", "A1", "A2", "B1", "B2"])

export type CefrLevel = z.infer<typeof cefrLevelSchema>

export const levelSchema = z.object({
  level: cefrLevelSchema,
  /** A short label for the level, e.g. "Beginner". */
  title: z.string().min(1),
  /** What a learner can do by the end of this level. */
  description: z.string().min(1),
  /** The grammar points this level introduces. */
  grammar: z.array(z.string().min(1)).min(1),
})

export type Level = z.infer<typeof levelSchema>

export const trackSchema = z.object({
  track: trackIdSchema,
  name: z.string().min(1),
  /** The whole ladder, including levels that have no units yet. */
  levels: z.array(levelSchema).min(1),
})

export type Track = z.infer<typeof trackSchema>

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
  /** The word that is spoken, with its article. */
  answer: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  /**
   * What is actually spoken.
   *
   * v0 speaks the word with the browser's voice, so this is the bare word
   * and the language to speak it in. Recorded audio would replace it.
   */
  audio: z.object({
    text: z.string().min(1),
    lang: z.string().min(2).max(5),
  }),
  translation: z.string().min(1),
  note: z.string().optional(),
})

export const exerciseSchema = z.discriminatedUnion("type", [
  selectExerciseSchema,
  matchExerciseSchema,
  typeInExerciseSchema,
  listenExerciseSchema,
])

/**
 * A grammar lesson.
 *
 * The explanation is read before the exercises, so a learner meets the rule
 * before they practise it.
 */
export const lessonExampleSchema = z.object({
  es: z.string().min(1),
  en: z.string().min(1),
})

export const lessonSectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().optional(),
  examples: z.array(lessonExampleSchema).optional(),
})

export const lessonExplanationSchema = z.object({
  summary: z.string().min(1),
  sections: z.array(lessonSectionSchema).default([]),
})

export type LessonExplanation = z.infer<typeof lessonExplanationSchema>

/**
 * A grammar drill: a sentence with a gap, and the word that fills it.
 *
 * Drills are authored by hand, because the point of them is to hit the
 * grammar, not the vocabulary.
 */
export const drillSchema = z.object({
  prompt: z.string().min(1),
  answer: z.string().min(1),
  /** What the answer means, shown after the learner tries. */
  meaning: z.string().min(1),
  note: z.string().optional(),
})

export type Drill = z.infer<typeof drillSchema>

export type SelectExercise = z.infer<typeof selectExerciseSchema>
export type MatchExercise = z.infer<typeof matchExerciseSchema>
export type TypeInExercise = z.infer<typeof typeInExerciseSchema>
export type ListenExercise = z.infer<typeof listenExerciseSchema>
export type Exercise = z.infer<typeof exerciseSchema>
export type ExerciseType = Exercise["type"]

export const unitSchema = z
  .object({
    track: trackIdSchema,
    level: cefrLevelSchema,
    unit: z.number().int().positive(),
    title: z.string().min(1),
    description: z.string().min(1),
    /** The lesson, read before the exercises. Not every unit has one yet. */
    explanation: lessonExplanationSchema.optional(),
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
