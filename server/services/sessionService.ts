import type { Exercise } from "#shared/content/schema"

import type { ExerciseOutcome } from "../domain/srs"

/** A lesson runs the units of a level; a practice session runs items due back. */
export type SessionKind = "unit" | "practice" | "repair"

export interface LessonSession {
  id: string
  kind: SessionKind
  track: string
  unit: number
  /** Full exercises, answers included. They never leave the server. */
  exercises: Exercise[]
  index: number
  pending: { exerciseId: string; outcome: ExerciseOutcome } | null
  counts: { correct: number; incorrect: number; skipped: number }
  createdAt: number
}

const sessions = new Map<string, LessonSession>()

export function createSession(
  track: string,
  unit: number,
  exercises: Exercise[],
  now: number,
  kind: SessionKind = "unit",
): LessonSession {
  const id = `s_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  const session: LessonSession = {
    id,
    kind,
    track,
    unit,
    exercises,
    index: 0,
    pending: null,
    counts: { correct: 0, incorrect: 0, skipped: 0 },
    createdAt: now,
  }

  sessions.set(id, session)

  return session
}

export function getSession(sessionId: string): LessonSession | null {
  return sessions.get(sessionId) ?? null
}

export function currentExercise(session: LessonSession): Exercise | null {
  return session.exercises[session.index] ?? null
}
