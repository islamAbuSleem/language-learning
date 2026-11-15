import { z } from "zod"

import { cefrLevelSchema, trackIdSchema } from "#shared/content/schema"

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
  level: cefrLevelSchema,
  unit: z.number().int().positive(),
  /**
   * `full` walks the whole unit; `repair` asks only the misses that are
   * still shaky. Anything else is rejected, and `full` stays the default so
   * older callers keep working.
   */
  scope: z.enum(["full", "repair"]).default("full"),
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
  z.object({
    id: z.string().min(1),
    type: z.literal("select"),
    prompt: z.string(),
    options: z.array(z.string()),
    audioFiles: z.record(z.string(), z.string()),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("match"),
    prompt: z.string(),
    pairs: z.array(z.object({ left: z.string(), right: z.string() })),
  }),
  z.object({ id: z.string().min(1), type: z.literal("type_in"), prompt: z.string() }),
  z.object({
    id: z.string().min(1),
    type: z.literal("listen"),
    prompt: z.string(),
    options: z.array(z.string()),
    audioFiles: z.record(z.string(), z.string()),
    audio: z.object({
      text: z.string(),
      lang: z.string(),
      /** Our own recording of the word, when there is one. */
      file: z.string().optional(),
    }),
  }),
])

export type ClientExercise = z.infer<typeof clientExerciseSchema>

export const learnerProfileSchema = z.object({
  xp: z.number().int().nonnegative(),
  streak: z.number().int().nonnegative(),
})

export type LearnerProfilePayload = z.infer<typeof learnerProfileSchema>

/**
 * The signed-in learner, as the client may see them.
 *
 * No secrets cross this line: no hashes, no tokens, no email verification
 * state the UI does not need.
 */
export const userSchema = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  displayName: z.string().min(1),
  hasPassword: z.boolean(),
  hasGoogle: z.boolean(),
  createdAt: z.string().min(1),
})

export type UserPayload = z.infer<typeof userSchema>

/** Which ways in are switched on. Password always is. */
export const authMethodsSchema = z.object({
  password: z.boolean(),
  magic: z.boolean(),
  google: z.boolean(),
})

export type AuthMethods = z.infer<typeof authMethodsSchema>

const emailSchema = z.string().trim().email().max(254)

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use at most 128 characters.")

export const signupRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(40).optional(),
})

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
})

export const magicRequestSchema = z.object({
  email: emailSchema,
})

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
})

export const passwordSetSchema = z.object({
  currentPassword: z.string().min(1).max(128).optional(),
  newPassword: passwordSchema,
})

export const itemProgressSchema = z.object({
  itemId: z.string().min(1),
  mastery: z.number().min(0).max(1),
  stability: z.number().nonnegative(),
  dueAt: z.number().int().nonnegative(),
})

export type ItemProgressPayload = z.infer<typeof itemProgressSchema>

/**
 * The gate: the learner's errors against what they have learned.
 *
 * `held` is true while the path waits for those errors to be practised.
 */
export const errorGateSchema = z.object({
  held: z.boolean(),
  errors: z.number().int().nonnegative(),
  /** Errors over items met, 0..1. */
  errorShare: z.number().min(0).max(1),
  /** The share allowed before the path waits. */
  ceiling: z.number().min(0).max(1),
  /** Items the learner has met. */
  met: z.number().int().nonnegative(),
  message: z.string(),
})

export type ErrorGatePayload = z.infer<typeof errorGateSchema>

/** What the learner knows and what is still wrong. */
export const learningProgressSchema = errorGateSchema.extend({
  /** Items still shaky: below the mastery ceiling. */
  shaky: z.number().int().nonnegative(),
  /** Answers given, and how many were right. */
  answered: z.number().int().nonnegative(),
  right: z.number().int().nonnegative(),
  /** Right over answered, 0..1. Null before the first answer. */
  accuracy: z.number().min(0).max(1).nullable(),
})

export type LearningProgressPayload = z.infer<typeof learningProgressSchema>
