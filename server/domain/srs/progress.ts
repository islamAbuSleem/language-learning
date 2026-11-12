import { isYesterday, toIsoDate } from "./dates"
import type { ExerciseOutcome } from "./types"

export const MAX_HEARTS = 5
export const XP_PER_EXERCISE = 2

export interface LearnerProfile {
  hearts: number
  maxHearts: number
  xp: number
  streak: number
  /** Last day the learner practised, as `YYYY-MM-DD`. */
  lastPracticeDate: string | null
}

export function createLearnerProfile(): LearnerProfile {
  return {
    hearts: MAX_HEARTS,
    maxHearts: MAX_HEARTS,
    xp: 0,
    streak: 0,
    lastPracticeDate: null,
  }
}

/**
 * A wrong answer costs one heart. The floor is zero: the learner has to wait
 * for the refill instead of going negative.
 */
export function applyHeartLoss(profile: LearnerProfile): LearnerProfile {
  return { ...profile, hearts: Math.max(0, profile.hearts - 1) }
}

export function applyHeartRefill(profile: LearnerProfile): LearnerProfile {
  return { ...profile, hearts: profile.maxHearts }
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
  const hearts = outcome === "incorrect" ? Math.max(0, profile.hearts - 1) : profile.hearts
  const xp = outcome === "skipped" ? profile.xp : profile.xp + XP_PER_EXERCISE
  const streak = nextStreak(profile, today)

  return { ...profile, hearts, xp, streak, lastPracticeDate: today }
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
