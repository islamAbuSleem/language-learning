import { describe, expect, it } from "vitest"

import type { ItemState } from "../../shared/srs/types"
import { levelAccuracy, streaks } from "../../server/domain/progress/stats"

const NOW = 1_700_000_000_000

function state(itemId: string, reps: number, lapses: number): ItemState {
  return {
    itemId,
    mastery: 0.9,
    reps,
    lapses,
    stability: 30,
    dueAt: NOW,
    lastReviewedAt: NOW,
  }
}

describe("level accuracy", () => {
  it("is null before the learner answers anything there", () => {
    const accuracy = levelAccuracy("A1", [])

    expect(accuracy.answered).toBe(0)
    expect(accuracy.accuracy).toBeNull()
  })

  it("counts right answers over attempts in one level", () => {
    const states = [
      state("es/a1/u1/select/a", 3, 1),
      state("es/a1/u2/select/b", 1, 0),
      state("es/a2/u1/select/c", 1, 1),
    ]

    const accuracy = levelAccuracy("A1", states)

    expect(accuracy.answered).toBe(2)
    // Three right out of four.
    expect(accuracy.accuracy).toBeCloseTo(0.75)
  })

  it("ignores other levels", () => {
    const states = [state("es/a2/u1/select/c", 2, 0)]

    expect(levelAccuracy("A1", states).accuracy).toBeNull()
    expect(levelAccuracy("A2", states).accuracy).toBeCloseTo(1)
  })
})

describe("streaks from practised days", () => {
  it("is zero with no days", () => {
    expect(streaks([], "2026-11-12")).toEqual({ current: 0, longest: 0 })
  })

  it("counts a run ending today, and remembers the longest", () => {
    const days = ["2026-11-08", "2026-11-09", "2026-11-10", "2026-11-12"]

    // Two days, a missed day, then today: current is 1, longest is 3.
    expect(streaks(days, "2026-11-12")).toEqual({ current: 1, longest: 3 })
  })

  it("keeps yesterday's run alive when today is still blank", () => {
    const days = ["2026-11-10", "2026-11-11"]

    expect(streaks(days, "2026-11-12")).toEqual({ current: 2, longest: 2 })
  })

  it("lets a broken run go", () => {
    const days = ["2026-11-05", "2026-11-10"]

    expect(streaks(days, "2026-11-12")).toEqual({ current: 0, longest: 1 })
  })

  it("does not double-count a day practised twice", () => {
    const days = ["2026-11-12", "2026-11-12"]

    expect(streaks(days, "2026-11-12")).toEqual({ current: 1, longest: 1 })
  })
})
