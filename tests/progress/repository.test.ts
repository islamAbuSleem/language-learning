import { describe, expect, it } from "vitest"

import { createInMemoryProgressRepository } from "../../server/domain/progress/inMemoryProgressRepository"
import { applyOutcome, createItemState } from "../../server/domain/srs/mastery"

const LEARNER = "learner-a"
const NOW = 1_760_000_000_000

const ITEM_ID = "es/a1/u1/select/cafe"

describe("the progress repository", () => {
  it("gives a new learner an empty profile", async () => {
    const repository = createInMemoryProgressRepository()

    const profile = await repository.loadProfile(LEARNER)

    expect(profile.xp).toBe(0)
    expect(profile.streak).toBe(0)
    expect(profile.lastPracticeDate).toBeNull()
  })

  it("round-trips a profile and an item in one write", async () => {
    const repository = createInMemoryProgressRepository()
    const item = applyOutcome(createItemState(ITEM_ID, NOW), "correct", "too_easy", NOW)

    await repository.recordExercise(LEARNER, item, {
      xp: 2,
      streak: 1,
      lastPracticeDate: "2026-11-12",
    })

    expect(await repository.loadProfile(LEARNER)).toEqual({
      xp: 2,
      streak: 1,
      lastPracticeDate: "2026-11-12",
    })
    expect(await repository.loadItem(LEARNER, ITEM_ID)).toEqual(item)
  })

  it("keeps learners apart", async () => {
    const repository = createInMemoryProgressRepository()
    const item = createItemState(ITEM_ID, NOW)

    await repository.recordExercise("one", item, { xp: 5, streak: 1, lastPracticeDate: "2026-11-12" })
    await repository.recordExercise("two", item, { xp: 9, streak: 2, lastPracticeDate: "2026-11-12" })

    expect((await repository.loadProfile("one")).xp).toBe(5)
    expect((await repository.loadProfile("two")).xp).toBe(9)
  })

  it("returns null for an item the learner has never met", async () => {
    const repository = createInMemoryProgressRepository()

    expect(await repository.loadItem(LEARNER, "unknown")).toBeNull()
  })

  it("lists only the learner's own items", async () => {
    const repository = createInMemoryProgressRepository()

    await repository.recordExercise("one", createItemState("a", NOW), {
      xp: 0,
      streak: 0,
      lastPracticeDate: null,
    })
    await repository.recordExercise("one", createItemState("b", NOW), {
      xp: 0,
      streak: 0,
      lastPracticeDate: null,
    })
    await repository.recordExercise("two", createItemState("c", NOW), {
      xp: 0,
      streak: 0,
      lastPracticeDate: null,
    })

    const items = await repository.listItems("one")

    expect(items.map((item) => item.itemId).sort()).toEqual(["a", "b"])
  })
})
