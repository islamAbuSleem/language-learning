import { describe, expect, it } from "vitest"

import {
  ERROR_SHARE_CEILING,
  describeLearningProgress,
  errorGate,
} from "../../server/domain/progress/gate"
import type { ItemState } from "../../shared/srs/types"

const NOW = 1_700_000_000_000

/**
 * An item the learner has met.
 *
 * `lapses` says how often it was missed, `mastery` says whether it is solid
 * again. An item that was missed once and is still shaky is an error.
 */
function item(
  itemId: string,
  overrides: Partial<ItemState> = {},
): ItemState {
  return {
    itemId,
    mastery: 0.9,
    reps: 1,
    lapses: 0,
    stability: 30,
    dueAt: NOW + 86_400_000,
    lastReviewedAt: NOW,
    ...overrides,
  }
}

describe("what the learner knows", () => {
  it("counts the items they have met", () => {
    const progress = describeLearningProgress([item("a"), item("b")])

    expect(progress.met).toBe(2)
    expect(progress.errors).toBe(0)
    expect(progress.errorShare).toBe(0)
  })

  it("does not count an item that was never shown", () => {
    const progress = describeLearningProgress([item("a", { lastReviewedAt: null })])

    expect(progress.met).toBe(0)
    expect(progress.accuracy).toBeNull()
  })

  it("counts a miss that is still shaky as an error", () => {
    const progress = describeLearningProgress([
      item("a", { mastery: 0.2, lapses: 1, reps: 2 }),
      item("b"),
    ])

    expect(progress.errors).toBe(1)
    expect(progress.shaky).toBe(1)
  })

  it("forgets a miss the learner has made solid again", () => {
    const progress = describeLearningProgress([item("a", { mastery: 0.9, lapses: 1, reps: 2 })])

    expect(progress.errors).toBe(0)
    expect(progress.shaky).toBe(0)
  })

  it("does not call a word never missed an error, even when it is shaky", () => {
    const progress = describeLearningProgress([item("a", { mastery: 0.2 })])

    expect(progress.shaky).toBe(1)
    expect(progress.errors).toBe(0)
  })

  it("measures accuracy over the answers", () => {
    const progress = describeLearningProgress([
      item("a", { reps: 3, lapses: 1 }),
      item("b", { reps: 1 }),
    ])

    expect(progress.accuracy).toBeCloseTo(0.75)
  })
})

describe("the gate", () => {
  it("lets a learner with no errors straight through", () => {
    const gate = errorGate(describeLearningProgress([item("a"), item("b")]))

    expect(gate.held).toBe(false)
  })

  it("lets a learner who has met nothing straight through", () => {
    const gate = errorGate(describeLearningProgress([]))

    expect(gate.held).toBe(false)
  })

  it("holds the path when too much of the learning is still wrong", () => {
    // Three errors out of ten met: 30%, over the ceiling.
    const states = [
      item("a", { mastery: 0.2, lapses: 1 }),
      item("b", { mastery: 0.2, lapses: 1 }),
      item("c", { mastery: 0.2, lapses: 1 }),
      ...Array.from({ length: 7 }, (_, index) => item(`ok-${index}`)),
    ]

    const gate = errorGate(describeLearningProgress(states))

    expect(gate.held).toBe(true)
    expect(gate.errors).toBe(3)
    expect(gate.errorShare).toBeCloseTo(0.3)
    expect(gate.message).toContain("3")
  })

  it("lets a learner through when the errors are a small share", () => {
    // One error out of ten met: 10%, under the ceiling.
    const states = [
      item("a", { mastery: 0.2, lapses: 1 }),
      ...Array.from({ length: 9 }, (_, index) => item(`ok-${index}`)),
    ]

    const gate = errorGate(describeLearningProgress(states))

    expect(gate.held).toBe(false)
    expect(ERROR_SHARE_CEILING).toBe(0.2)
  })

  it("opens the path again once the errors are practised away", () => {
    const states = [
      item("a", { mastery: 0.9, lapses: 1, reps: 4 }),
      ...Array.from({ length: 9 }, (_, index) => item(`ok-${index}`)),
    ]

    const gate = errorGate(describeLearningProgress(states))

    expect(gate.held).toBe(false)
    expect(gate.errors).toBe(0)
  })
})
