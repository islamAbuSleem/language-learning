import { describe, expect, it } from "vitest"

import { computeUnitLocks, lockFor, unitKey } from "../../server/domain/progress/unlock"

function unit(level: string, number: number, ids: string[]) {
  return { level, unit: number, exerciseIds: ids }
}

describe("the path locks", () => {
  it("opens the first unit of the path", () => {
    const locks = computeUnitLocks([unit("A0", 1, ["a", "b"])], new Set())

    expect(locks[0]?.locked).toBe(false)
    expect(locks[0]?.completed).toBe(false)
  })

  it("locks a unit whose predecessor is not finished", () => {
    const locks = computeUnitLocks(
      [unit("A0", 1, ["a"]), unit("A0", 2, ["b"]), unit("A1", 1, ["c"])],
      new Set(["a"]),
    )

    expect(locks[0]?.locked).toBe(false)
    expect(locks[0]?.completed).toBe(true)
    expect(locks[1]?.locked).toBe(false)
    expect(locks[2]?.locked).toBe(true)
  })

  it("opens the next unit the moment the last exercise is answered", () => {
    const locks = computeUnitLocks(
      [unit("A0", 1, ["a", "b"]), unit("A0", 2, ["c"])],
      new Set(["a", "b"]),
    )

    expect(locks[0]?.completed).toBe(true)
    expect(locks[1]?.locked).toBe(false)
  })

  it("needs every exercise of the unit, not just one", () => {
    const locks = computeUnitLocks(
      [unit("A0", 1, ["a", "b"]), unit("A0", 2, ["c"])],
      new Set(["a"]),
    )

    expect(locks[0]?.completed).toBe(false)
    expect(locks[1]?.locked).toBe(true)
  })

  it("crosses level boundaries in order", () => {
    const locks = computeUnitLocks(
      [unit("A0", 2, ["a"]), unit("A1", 1, ["b"]), unit("A2", 7, ["c"])],
      new Set(["a", "b"]),
    )

    expect(locks[2]?.locked).toBe(false)
  })

  it("never leaves a gap: the whole path opens once every unit is done", () => {
    const units = [
      unit("A0", 1, ["a"]),
      unit("A0", 2, ["b"]),
      unit("A1", 1, ["c"]),
    ]
    const locks = computeUnitLocks(units, new Set(["a", "b", "c"]))

    expect(locks.every((lock) => !lock.locked)).toBe(true)
    expect(locks.every((lock) => lock.completed)).toBe(true)
  })

  it("finds the lock for one unit", () => {
    const locks = computeUnitLocks([unit("A0", 1, ["a"]), unit("A1", 1, ["b"])], new Set())

    expect(lockFor(locks, "A1", 1)?.locked).toBe(true)
    expect(lockFor(locks, "A0", 1)?.locked).toBe(false)
    expect(lockFor(locks, "A2", 1)).toBeNull()
  })

  it("builds a key from a level and a unit", () => {
    expect(unitKey("A0", 1)).toBe("A0/1")
  })
})
