import { describe, expect, it } from "vitest"

import { createItemState } from "../../server/domain/srs/mastery"
import {
  PRACTICE_MASTERY_CEILING,
  isDue,
  selectPracticeItems,
  selectRepairStates,
  selectReviewItems,
} from "../../server/domain/srs/selection"
import type { ItemState } from "../../server/domain/srs/types"

const NOW = 1_760_000_000_000

function item(overrides: Partial<ItemState> & { itemId: string }): ItemState {
  return { ...createItemState(overrides.itemId, NOW), ...overrides }
}

describe("isDue", () => {
  it("is due at the deadline and not before it", () => {
    expect(isDue(item({ itemId: "a", dueAt: NOW }), NOW)).toBe(true)
    expect(isDue(item({ itemId: "a", dueAt: NOW + 1 }), NOW)).toBe(false)
  })
})

describe("selectPracticeItems", () => {
  it("only takes items the learner is shaky on", () => {
    const states = [
      item({ itemId: "weak", mastery: 0.2, dueAt: NOW }),
      item({ itemId: "strong", mastery: PRACTICE_MASTERY_CEILING + 0.1, dueAt: NOW }),
    ]

    expect(selectPracticeItems(states, 5, NOW).map((s) => s.itemId)).toEqual(["weak"])
  })

  it("skips items that are not due yet", () => {
    const states = [
      item({ itemId: "later", mastery: 0.1, dueAt: NOW + 10_000 }),
      item({ itemId: "now", mastery: 0.1, dueAt: NOW }),
    ]

    expect(selectPracticeItems(states, 5, NOW).map((s) => s.itemId)).toEqual(["now"])
  })

  it("takes the oldest due item first", () => {
    const states = [
      item({ itemId: "newer", mastery: 0.1, dueAt: NOW - 1 }),
      item({ itemId: "older", mastery: 0.1, dueAt: NOW - 100 }),
    ]

    expect(selectPracticeItems(states, 1, NOW).map((s) => s.itemId)).toEqual(["older"])
  })

  it("never returns more than asked for", () => {
    const states = [
      item({ itemId: "a", mastery: 0.1, dueAt: NOW }),
      item({ itemId: "b", mastery: 0.1, dueAt: NOW }),
    ]

    expect(selectPracticeItems(states, 1, NOW)).toHaveLength(1)
  })
})

describe("selectRepairStates", () => {
  const ids = ["es/a0/u1/select/a", "es/a0/u1/select/b", "es/a0/u2/select/c"]

  it("takes only the missed items of the unit that are still shaky", () => {
    const states = [
      item({ itemId: ids[0], mastery: 0.1, lapses: 1 }),
      item({ itemId: ids[1], mastery: 0.1, lapses: 0 }),
      item({ itemId: ids[2], mastery: 0.1, lapses: 2 }),
    ]

    expect(selectRepairStates([ids[0], ids[1]], states, 10).map((s) => s.itemId)).toEqual([ids[0]])
  })

  it("leaves out a miss the learner has already made solid", () => {
    const states = [
      item({ itemId: ids[0], mastery: PRACTICE_MASTERY_CEILING + 0.1, lapses: 1 }),
      item({ itemId: ids[1], mastery: 0.1, lapses: 1 }),
    ]

    expect(selectRepairStates([ids[0], ids[1]], states, 10).map((s) => s.itemId)).toEqual([ids[1]])
  })

  it("orders the weakest miss first and never returns more than asked for", () => {
    const states = [
      item({ itemId: ids[0], mastery: 0.3, lapses: 1 }),
      item({ itemId: ids[1], mastery: 0.1, lapses: 1 }),
    ]

    expect(selectRepairStates([ids[0], ids[1]], states, 10).map((s) => s.itemId)).toEqual([
      ids[1],
      ids[0],
    ])
    expect(selectRepairStates([ids[0], ids[1]], states, 1).map((s) => s.itemId)).toEqual([ids[1]])
  })
})

describe("selectReviewItems", () => {
  it("includes strong items and orders the weakest first", () => {
    const states = [
      item({ itemId: "strong", mastery: 0.9, dueAt: NOW }),
      item({ itemId: "weak", mastery: 0.2, dueAt: NOW }),
    ]

    expect(selectReviewItems(states, 5, NOW).map((s) => s.itemId)).toEqual(["weak", "strong"])
  })

  it("leaves out items that are not due", () => {
    const states = [item({ itemId: "later", mastery: 0.2, dueAt: NOW + 1 })]

    expect(selectReviewItems(states, 5, NOW)).toHaveLength(0)
  })
})
