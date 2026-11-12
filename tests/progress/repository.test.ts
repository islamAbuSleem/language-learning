import { describe, expect, it } from "vitest"

import { createInMemoryProgressRepository } from "../../server/domain/progress/inMemoryProgressRepository"
import { applyOutcome, createItemState } from "../../server/domain/srs/mastery"
import type { ItemState } from "../../server/domain/srs/types"

const LEARNER = "learner-a"
const NOW = 1_760_000_000_000

describe("the progress repository", () => {
  it("gives a new learner an empty profile", async () => {
    const repository = createInMemoryProgressRepository()

    const profile = await repository.loadProfile(LEARNER)

    expect(profile.xp).toBe(0)
    expect(profile.streak).toBe(0)
    expect(profile.lastPracticeDate).toBeNull()
  })

  it("round-trips a profile", async () => {
    const repository = createInMemoryProgressRepository()

    await repository.saveProfile(LEARNER, { xp: 20, streak: 3, lastPracticeDate: "2026-11-12" })
    const loaded = await repository.loadProfile(LEARNER)

    expect(loaded).toEqual({ xp: 20, streak: 3, lastPracticeDate: "2026-11-12" })
  })

  it("keeps learners apart", async () => {
    const repository = createInMemoryProgressRepository()

    await repository.saveProfile("one", { xp: 5, streak: 1, lastPracticeDate: "2026-11-12" })
    await repository.saveProfile("two", { xp: 9, streak: 2, lastPracticeDate: "2026-11-12" })

    expect((await repository.loadProfile("one")).xp).toBe(5)
    expect((await repository.loadProfile("two")).xp).toBe(9)
  })

  it("round-trips an item's memory state", async () => {
    const repository = createInMemoryProgressRepository()
    const item: ItemState = applyOutcome(
      createItemState("es/a1/u1/select/cafe", NOW),
      "correct",
      "too_easy",
      NOW,
    )

    await repository.saveItem(LEARNER, item)
    const loaded = await repository.loadItem(LEARNER, "es/a1/u1/select/cafe")

    expect(loaded).toEqual(item)
  })

  it("returns null for an item the learner has never met", async () => {
    const repository = createInMemoryProgressRepository()

    expect(await repository.loadItem(LEARNER, "unknown")).toBeNull()
  })

  it("lists only the learner's own items", async () => {
    const repository = createInMemoryProgressRepository()

    await repository.saveItem("one", createItemState("a", NOW))
    await repository.saveItem("one", createItemState("b", NOW))
    await repository.saveItem("two", createItemState("c", NOW))

    const items = await repository.listItems("one")

    expect(items.map((item) => item.itemId).sort()).toEqual(["a", "b"])
  })
})
