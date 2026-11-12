import { describe, expect, it } from "vitest"

import {
  UNIT_ACCURACY_FLOOR,
  describePath,
  describeUnit,
  progressFor,
  unitKey,
  unitsToRevisit,
} from "../../server/domain/progress/unitProgress"
import type { ItemState } from "../../shared/srs/types"

const NOW = 1_700_000_000_000

function unit(level: string, number: number, ids: string[]) {
  return { level, unit: number, exerciseIds: ids }
}

/**
 * An item the learner has met.
 *
 * `mastery` and `reps` are what the SRS leaves behind; `lastReviewedAt` is
 * what says the item was shown at all, which is what finishes a unit.
 */
function state(
  itemId: string,
  options: { reps?: number; lapses?: number; mastery?: number; seen?: boolean } = {},
): ItemState {
  const seen = options.seen ?? true

  return {
    itemId,
    mastery: options.mastery ?? 0.9,
    reps: options.reps ?? 1,
    lapses: options.lapses ?? 0,
    stability: 30,
    dueAt: NOW + 86_400_000,
    lastReviewedAt: seen ? NOW : null,
  }
}

function states(...items: ItemState[]): Map<string, ItemState> {
  return new Map(items.map((item) => [item.itemId, item]))
}

describe("the state of a unit", () => {
  it("is not finished before the learner has seen it", () => {
    const progress = describeUnit(unit("A0", 1, ["a", "b"]), states(), NOW)

    expect(progress.answered).toBe(0)
    expect(progress.completed).toBe(false)
    expect(progress.accuracy).toBeNull()
  })

  it("is finished when every exercise has been seen", () => {
    const progress = describeUnit(
      unit("A0", 1, ["a", "b"]),
      states(state("a"), state("b")),
      NOW,
    )

    expect(progress.answered).toBe(2)
    expect(progress.completed).toBe(true)
  })

  it("counts a skipped exercise as seen, so a skip cannot hold the path open", () => {
    // A skip shows the solution and costs nothing, so the unit is finished.
    // Only an unanswered exercise holds the next unit back.
    const progress = describeUnit(
      unit("A0", 1, ["a", "b"]),
      states(state("a", { reps: 0, seen: true }), state("b")),
      NOW,
    )

    expect(progress.answered).toBe(2)
    expect(progress.completed).toBe(true)
  })

  it("measures accuracy over the answers, not over the exercises", () => {
    const progress = describeUnit(
      unit("A0", 1, ["a", "b"]),
      states(state("a", { reps: 3, lapses: 1 }), state("b", { reps: 1, lapses: 0 })),
      NOW,
    )

    // Three right out of four.
    expect(progress.accuracy).toBeCloseTo(0.75)
  })

  it("counts the words that are still shaky", () => {
    const progress = describeUnit(
      unit("A0", 1, ["a", "b"]),
      states(state("a", { mastery: 0.3 }), state("b", { mastery: 0.9 })),
      NOW,
    )

    expect(progress.shaky).toBe(1)
  })
})

describe("the path", () => {
  it("opens the first unit of the path", () => {
    const progress = describePath([unit("A0", 1, ["a", "b"])], states(), NOW)

    expect(progress[0]?.status).toBe("current")
    expect(progress[0]?.completed).toBe(false)
  })

  it("locks a unit whose predecessor is not finished", () => {
    const progress = describePath(
      [unit("A0", 1, ["a"]), unit("A0", 2, ["b"]), unit("A1", 1, ["c"])],
      states(state("a")),
      NOW,
    )

    expect(progress[0]?.status).toBe("done")
    expect(progress[1]?.status).toBe("current")
    expect(progress[2]?.status).toBe("locked")
  })

  it("opens the next unit the moment the last exercise is seen", () => {
    const progress = describePath(
      [unit("A0", 1, ["a", "b"]), unit("A0", 2, ["c"])],
      states(state("a"), state("b")),
      NOW,
    )

    expect(progress[0]?.status).toBe("done")
    expect(progress[1]?.status).toBe("current")
  })

  it("calls a unit weak when it was answered badly", () => {
    const progress = describePath(
      [unit("A0", 1, ["a", "b"])],
      states(state("a", { reps: 4, lapses: 3 }), state("b")),
      NOW,
    )

    expect(progress[0]?.status).toBe("weak")
  })

  it("calls a unit done when it was answered well", () => {
    const progress = describePath(
      [unit("A0", 1, ["a", "b"])],
      states(state("a"), state("b")),
      NOW,
    )

    expect(progress[0]?.status).toBe("done")
  })

  it("keeps the line at eight right answers in ten", () => {
    const items = Array.from({ length: 10 }, (_, index) =>
      state(`item-${index}`, { reps: 1, lapses: index < 2 ? 1 : 0 }),
    )

    const progress = describePath([unit("A0", 1, items.map((i) => i.itemId))], states(...items), NOW)

    expect(progress[0]?.accuracy).toBeCloseTo(0.8)
    expect(progress[0]?.status).toBe("done")
    expect(UNIT_ACCURACY_FLOOR).toBe(0.8)
  })

  it("never leaves a gap: the whole path opens once every unit is done", () => {
    const units = [unit("A0", 1, ["a"]), unit("A0", 2, ["b"]), unit("A1", 1, ["c"])]
    const progress = describePath(units, states(state("a"), state("b"), state("c")), NOW)

    expect(progress.every((entry) => entry.status === "done")).toBe(true)
  })
})

describe("the revisit path", () => {
  it("offers the weak units, worst first", () => {
    const progress = describePath(
      [unit("A0", 1, ["a"]), unit("A0", 2, ["b"]), unit("A1", 1, ["c"])],
      states(
        state("a", { reps: 2, lapses: 1 }),
        state("b", { reps: 4, lapses: 3 }),
        state("c", { reps: 4, lapses: 0 }),
      ),
      NOW,
    )

    const revisit = unitsToRevisit(progress)

    expect(revisit.map((entry) => entry.key)).toEqual(["A0/2", "A0/1"])
  })

  it("finds one unit in the path", () => {
    const progress = describePath([unit("A0", 1, ["a"]), unit("A1", 1, ["b"])], states(), NOW)

    expect(progressFor(progress, "A1", 1)?.key).toBe("A1/1")
    expect(progressFor(progress, "A2", 1)).toBeNull()
  })

  it("builds a key from a level and a unit", () => {
    expect(unitKey("A0", 1)).toBe("A0/1")
  })
})
