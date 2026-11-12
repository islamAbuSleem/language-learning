import type { ClientExercise, ExerciseResponsePayload, LearnerProfilePayload } from "#shared/api/schemas"
import type { DifficultyGrade, ExerciseOutcome } from "#shared/srs/types"

export interface LessonFeedback {
  outcome: ExerciseOutcome
  correctAnswer: string
  translation: string | null
  note: string | null
}

export interface LessonSummary {
  correct: number
  incorrect: number
  skipped: number
  xp: number
}

/**
 * The lesson state machine.
 *
 * The server owns the answer key, so the client only ever sends what the
 * learner did and renders what came back.
 */
export function useLessonSession(track: string, level: string, unit: number) {
  const phase = ref<"loading" | "answering" | "feedback" | "done">("loading")
  const sessionId = ref<string | null>(null)
  const exercise = ref<ClientExercise | null>(null)
  const feedback = ref<LessonFeedback | null>(null)
  const profile = ref<LearnerProfilePayload | null>(null)
  const index = ref(0)
  const total = ref(0)
  const counts = ref({ correct: 0, incorrect: 0, skipped: 0 })
  const error = ref<string | null>(null)

  const selection = ref<string | null>(null)
  const typed = ref("")
  const matchedPairs = ref<Record<string, string>>({})

  /**
   * True while the server is writing progress.
   *
   * Saving takes a round trip to the database, and the learner must not answer
   * the next exercise while the previous one is still being written: the
   * response would reset the answer they just gave.
   */
  const saving = ref(false)

  function resetAnswerState() {
    selection.value = null
    typed.value = ""
    matchedPairs.value = {}
  }

  async function start() {
    phase.value = "loading"
    resetAnswerState()

    try {
      const response = await $fetch<{
        sessionId: string
        total: number
        index: number
        exercise: ClientExercise | null
        profile: LearnerProfilePayload
      }>("/api/session", { method: "POST", body: { track, level, unit } })

      sessionId.value = response.sessionId
      total.value = response.total
      index.value = response.index
      exercise.value = response.exercise
      profile.value = response.profile
      phase.value = response.exercise ? "answering" : "done"
    } catch (failure) {
      error.value = messageOf(failure)
      phase.value = "done"
    }
  }

  /** The server's own words, when it has them. */
  function messageOf(failure: unknown): string {
    if (failure && typeof failure === "object" && "data" in failure) {
      const data = (failure as { data?: { statusMessage?: string; message?: string } }).data
      if (data?.statusMessage) return data.statusMessage
      if (data?.message) return data.message
    }
    if (failure instanceof Error) return failure.message

    return "Something went wrong. Try again."
  }

  /** The learner's current input, in the shape the API expects. */
  function buildResponse(): ExerciseResponsePayload | null {
    if (!exercise.value) return null

    switch (exercise.value.type) {
      case "select":
      case "listen":
        return selection.value ? { kind: "choice", value: selection.value } : null
      case "type_in":
        return typed.value.trim().length > 0 ? { kind: "text", value: typed.value } : null
      case "match": {
        const pairs = Object.entries(matchedPairs.value).map(([left, right]) => ({ left, right }))
        return pairs.length > 0 ? { kind: "match", pairs } : null
      }
    }
  }

  /**
   * Start a practice session: the items the learner has met come back.
   *
   * `due` follows the schedule, `weak` follows the mastery.
   */
  async function startPractice(mode: "due" | "weak" = "due", count = 10) {
    phase.value = "loading"
    resetAnswerState()

    const response = await $fetch<{
      sessionId: string | null
      total: number
      index: number
      exercise: ClientExercise | null
      profile: LearnerProfilePayload
    }>("/api/practice", { method: "POST", body: { mode, count } })

    sessionId.value = response.sessionId
    total.value = response.total
    index.value = response.index
    exercise.value = response.exercise
    profile.value = response.profile
    phase.value = response.exercise ? "answering" : "done"
  }

  const canCheck = computed(() => buildResponse() !== null)

  async function submit(response: ExerciseResponsePayload) {
    if (!sessionId.value || saving.value) return

    saving.value = true
    try {
      const result = await $fetch<LessonFeedback>("/api/answer", {
        method: "POST",
        body: { sessionId: sessionId.value, response },
      })

      feedback.value = result
      phase.value = "feedback"
    } finally {
      saving.value = false
    }
  }

  async function check() {
    const response = buildResponse()
    if (!response) return

    await submit(response)
  }

  async function skip() {
    await submit({ kind: "skip" })
  }

  /**
   * Apply the learner's own difficulty grade and move on.
   *
   * The grade is optional: not picking one means neutral.
   */
  async function complete(grade: DifficultyGrade) {
    if (!sessionId.value || saving.value) return

    saving.value = true
    try {
      const result = await $fetch<{
        index: number
        done: boolean
        exercise: ClientExercise | null
        profile: LearnerProfilePayload
        counts: { correct: number; incorrect: number; skipped: number }
      }>("/api/complete", {
        method: "POST",
        body: { sessionId: sessionId.value, grade },
      })

      index.value = result.index
      counts.value = result.counts
      profile.value = result.profile
      exercise.value = result.exercise
      feedback.value = null
      resetAnswerState()
      phase.value = result.done ? "done" : "answering"
    } finally {
      saving.value = false
    }
  }

  const summary = computed<LessonSummary>(() => ({
    correct: counts.value.correct,
    incorrect: counts.value.incorrect,
    skipped: counts.value.skipped,
    xp: profile.value?.xp ?? 0,
  }))

  return {
    phase,
    exercise,
    feedback,
    profile,
    index,
    total,
    counts,
    summary,
    error,
    selection,
    typed,
    matchedPairs,
    canCheck,
    saving,
    start,
    startPractice,
    check,
    skip,
    complete,
  }
}
