import { describe, expect, it } from "vitest"

import { isIsoDate, previousIsoDate, toIsoDate } from "../../server/domain/srs/dates"
import {
  MAX_HEARTS,
  XP_PER_EXERCISE,
  applyExerciseResult,
  applyHeartRefill,
  createLearnerProfile,
  nextStreak,
} from "../../server/domain/srs/progress"

const NOW = Date.parse("2026-11-12T09:00:00.000Z")

describe("dates", () => {
  it("formats an epoch as an ISO day in UTC", () => {
    expect(toIsoDate(NOW)).toBe("2026-11-12")
  })

  it("recognises a malformed day", () => {
    expect(isIsoDate("2026-11-12")).toBe(true)
    expect(isIsoDate("12-11-2026")).toBe(false)
  })

  it("steps back one day across a month boundary", () => {
    expect(previousIsoDate("2026-12-01")).toBe("2026-11-30")
  })
})

describe("applyExerciseResult", () => {
  it("costs one heart for a wrong answer", () => {
    const profile = createLearnerProfile()

    const next = applyExerciseResult(profile, "incorrect", NOW)

    expect(next.hearts).toBe(MAX_HEARTS - 1)
  })

  it("never drops below zero hearts", () => {
    const profile = { ...createLearnerProfile(), hearts: 1 }

    const next = applyExerciseResult(profile, "incorrect", NOW)

    expect(next.hearts).toBe(0)
  })

  it("pays xp for a right answer and for a wrong one, but not for a skip", () => {
    const profile = createLearnerProfile()

    expect(applyExerciseResult(profile, "correct", NOW).xp).toBe(XP_PER_EXERCISE)
    expect(applyExerciseResult(profile, "incorrect", NOW).xp).toBe(XP_PER_EXERCISE)
    expect(applyExerciseResult(profile, "skipped", NOW).xp).toBe(0)
  })

  it("records the day the learner practised", () => {
    const next = applyExerciseResult(createLearnerProfile(), "correct", NOW)

    expect(next.lastPracticeDate).toBe("2026-11-12")
  })
})

describe("nextStreak", () => {
  const profile = { ...createLearnerProfile(), streak: 4 }

  it("starts the streak at one on the first practice", () => {
    expect(nextStreak(createLearnerProfile(), "2026-11-12")).toBe(1)
  })

  it("does not double count a second practice on the same day", () => {
    const practised = { ...createLearnerProfile(), streak: 4, lastPracticeDate: "2026-11-12" }

    expect(nextStreak(practised, "2026-11-12")).toBe(4)
  })

  it("continues the streak when the learner practised yesterday", () => {
    const practised = { ...createLearnerProfile(), streak: 4, lastPracticeDate: "2026-11-11" }

    expect(nextStreak(practised, "2026-11-12")).toBe(5)
  })

  it("resets the streak after a missed day", () => {
    const practised = { ...createLearnerProfile(), streak: 4, lastPracticeDate: "2026-11-09" }

    expect(nextStreak(practised, "2026-11-12")).toBe(1)
  })
})

describe("applyHeartRefill", () => {
  it("fills the hearts back to the maximum", () => {
    const spent = { ...createLearnerProfile(), hearts: 0 }

    expect(applyHeartRefill(spent).hearts).toBe(MAX_HEARTS)
  })
})
