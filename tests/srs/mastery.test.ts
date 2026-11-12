import { describe, expect, it } from "vitest"

import {
  applyOutcome,
  clampMastery,
  createItemState,
  masteryDelta,
} from "../../server/domain/srs/mastery"
import type { DifficultyGrade, ExerciseOutcome } from "../../server/domain/srs/types"

const NOW = 1_760_000_000_000

describe("masteryDelta", () => {
  it("grows fastest when the learner says the item was too easy", () => {
    expect(masteryDelta("correct", "too_easy")).toBe(0.3)
    expect(masteryDelta("correct", "neutral")).toBe(0.12)
    expect(masteryDelta("correct", "too_difficult")).toBe(0.02)
  })

  it("punishes a wrong answer harder when the learner says it was too difficult", () => {
    expect(masteryDelta("incorrect", "too_difficult")).toBe(-0.45)
    expect(masteryDelta("incorrect", "neutral")).toBe(-0.35)
  })

  it("treats 'too easy' on a wrong answer as neutral", () => {
    expect(masteryDelta("incorrect", "too_easy")).toBe(-0.35)
  })

  it("does not move mastery when the learner skips", () => {
    expect(masteryDelta("skipped", "neutral")).toBe(0)
  })
})

describe("clampMastery", () => {
  it("keeps mastery inside 0..1", () => {
    expect(clampMastery(-2)).toBe(0)
    expect(clampMastery(4)).toBe(1)
    expect(clampMastery(0.42)).toBe(0.42)
  })

  it("treats a non-finite value as zero", () => {
    expect(clampMastery(Number.NaN)).toBe(0)
  })
})

describe("applyOutcome", () => {
  it("raises mastery and counts a rep for a correct answer", () => {
    const state = createItemState("es/u1/select/gato", NOW)

    const next = applyOutcome(state, "correct", "too_easy", NOW)

    expect(next.mastery).toBeCloseTo(0.3)
    expect(next.reps).toBe(1)
    expect(next.lapses).toBe(0)
    expect(next.lastReviewedAt).toBe(NOW)
  })

  it("drops mastery and counts a lapse for a wrong answer", () => {
    const state = { ...createItemState("es/u1/select/gato", NOW), mastery: 0.5 }

    const next = applyOutcome(state, "incorrect", "too_difficult", NOW)

    expect(next.mastery).toBeCloseTo(0.05)
    expect(next.reps).toBe(1)
    expect(next.lapses).toBe(1)
  })

  it("never lets mastery go below zero", () => {
    const state = { ...createItemState("es/u1/select/gato", NOW), mastery: 0.1 }

    const next = applyOutcome(state, "incorrect", "too_difficult", NOW)

    expect(next.mastery).toBe(0)
  })

  it("keeps the item due immediately when skipped, without counting a rep", () => {
    const state = { ...createItemState("es/u1/select/gato", NOW), mastery: 0.3, reps: 2 }

    const next = applyOutcome(state, "skipped", "neutral", NOW)

    expect(next.mastery).toBe(0.3)
    expect(next.reps).toBe(2)
    expect(next.lapses).toBe(0)
    expect(next.stability).toBe(0)
    expect(next.dueAt).toBe(NOW)
  })

  it("applies every outcome and grade combination without leaving the range", () => {
    const outcomes: ExerciseOutcome[] = ["correct", "incorrect", "skipped"]
    const grades: DifficultyGrade[] = ["too_easy", "neutral", "too_difficult"]

    for (const outcome of outcomes) {
      for (const grade of grades) {
        const next = applyOutcome({ ...createItemState("item", NOW), mastery: 0.5 }, outcome, grade, NOW)
        expect(next.mastery).toBeGreaterThanOrEqual(0)
        expect(next.mastery).toBeLessThanOrEqual(1)
      }
    }
  })
})
