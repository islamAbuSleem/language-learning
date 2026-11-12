import { z } from "zod"

import { trackIdSchema } from "#shared/content/schema"

/**
 * The wire contract between the app and the API.
 *
 * The server grades every answer, so the client never receives the solution
 * for an exercise it has not answered yet.
 */

export const exerciseResponseSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("choice"), value: z.string().min(1) }),
  z.object({
    kind: z.literal("match"),
    pairs: z
      .array(z.object({ left: z.string().min(1), right: z.string().min(1) }))
      .min(1),
  }),
  z.object({ kind: z.literal("text"), value: z.string() }),
  z.object({ kind: z.literal("skip") }),
])

export type ExerciseResponsePayload = z.infer<typeof exerciseResponseSchema>

export const startSessionSchema = z.object({
  track: trackIdSchema,
  unit: z.number().int().positive(),
})

export const answerRequestSchema = z.object({
  sessionId: z.string().min(1),
  response: exerciseResponseSchema,
})

export const completeRequestSchema = z.object({
  sessionId: z.string().min(1),
  grade: z.enum(["too_easy", "too_difficult", "neutral"]),
})

export const clientExerciseSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string().min(1), type: z.literal("select"), prompt: z.string(), options: z.array(z.string()) }),
  z.object({
    id: z.string().min(1),
    type: z.literal("match"),
    prompt: z.string(),
    pairs: z.array(z.object({ left: z.string(), right: z.string() })),
  }),
  z.object({ id: z.string().min(1), type: z.literal("type_in"), prompt: z.string() }),
  z.object({ id: z.string().min(1), type: z.literal("listen"), prompt: z.string(), options: z.array(z.string()) }),
])

export type ClientExercise = z.infer<typeof clientExerciseSchema>

export const learnerProfileSchema = z.object({
  hearts: z.number().int().nonnegative(),
  maxHearts: z.number().int().positive(),
  xp: z.number().int().nonnegative(),
  streak: z.number().int().nonnegative(),
})

export type LearnerProfilePayload = z.infer<typeof learnerProfileSchema>

export const itemProgressSchema = z.object({
  itemId: z.string().min(1),
  mastery: z.number().min(0).max(1),
  stability: z.number().nonnegative(),
  dueAt: z.number().int().nonnegative(),
})

export type ItemProgressPayload = z.infer<typeof itemProgressSchema>
