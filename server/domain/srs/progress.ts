import { isYesterday, toIsoDate } from "./dates"
import type { ExerciseOutcome } from "./types"

export const XP_PER_EXERCISE = 2

/**
 * The learner profile.
 *
 * There are no hearts. A wrong answer costs nothing but mastery, so the
 * learner is never blocked out of a lesson and never waits for a refill.
 */
export interface LearnerProfile {
  xp: number
  streak: number
  /** Last day the learner practised, as `YYYY-MM-DD`. */
  lastPracticeDate: string | null
}

export function createLearnerProfile(): LearnerProfile {
  return {
    xp: 0,
    streak: 0,
    lastPracticeDate: null,
  }
}

/**
 * XP is earned for every answered exercise, correct or not — the point is
 * showing up, not being right.
 */
export function applyExerciseResult(
  profile: LearnerProfile,
  outcome: ExerciseOutcome,
  now: number,
): LearnerProfile {
  const today = toIsoDate(now)
  const xp = outcome === "skipped" ? profile.xp : profile.xp + XP_PER_EXERCISE
  const streak = nextStreak(profile, today)

  return { ...profile, xp, streak, lastPracticeDate: today }
}

/**
 * The streak continues only if the learner practised yesterday.
 */
export function nextStreak(profile: LearnerProfile, today: string): number {
  if (profile.lastPracticeDate === null) return 1
  if (profile.lastPracticeDate === today) return profile.streak
  if (isYesterday(profile.lastPracticeDate, today)) return profile.streak + 1
  return 1
}
