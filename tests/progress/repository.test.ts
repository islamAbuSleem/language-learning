import { describe, expect, it } from "vitest"

import { createInMemoryProgressRepository } from "../../server/domain/progress/inMemoryProgressRepository"
import { applyOutcome, createItemState } from "../../server/domain/srs/mastery"

const LEARNER = "learner-a"
const NOW = 1_760_000_000_000
const DAY = "2026-11-12"

const ITEM_ID = "es/a1/u1/select/cafe"

function dayScore(date: string, correct: boolean, xp: number) {
  return { date, answers: 1, correct: correct ? 1 : 0, xp }
}

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

    await repository.recordExercise(
      LEARNER,
      item,
      { xp: 2, streak: 1, lastPracticeDate: DAY },
      dayScore(DAY, true, 2),
    )

    expect(await repository.loadProfile(LEARNER)).toEqual({
      xp: 2,
      streak: 1,
      lastPracticeDate: DAY,
    })
    expect(await repository.loadItem(LEARNER, ITEM_ID)).toEqual(item)
  })

  it("keeps learners apart", async () => {
    const repository = createInMemoryProgressRepository()
    const item = createItemState(ITEM_ID, NOW)

    await repository.recordExercise(
      "one",
      item,
      { xp: 5, streak: 1, lastPracticeDate: DAY },
      dayScore(DAY, true, 5),
    )
    await repository.recordExercise(
      "two",
      item,
      { xp: 9, streak: 2, lastPracticeDate: DAY },
      dayScore(DAY, false, 0),
    )

    expect((await repository.loadProfile("one")).xp).toBe(5)
    expect((await repository.loadProfile("two")).xp).toBe(9)
  })

  it("returns null for an item the learner has never met", async () => {
    const repository = createInMemoryProgressRepository()

    expect(await repository.loadItem(LEARNER, "unknown")).toBeNull()
  })

  it("lists only the learner's own items", async () => {
    const repository = createInMemoryProgressRepository()

    await repository.recordExercise(
      "one",
      createItemState("a", NOW),
      { xp: 0, streak: 0, lastPracticeDate: null },
      dayScore(DAY, false, 0),
    )
    await repository.recordExercise(
      "one",
      createItemState("b", NOW),
      { xp: 0, streak: 0, lastPracticeDate: null },
      dayScore(DAY, true, 2),
    )
    await repository.recordExercise(
      "two",
      createItemState("c", NOW),
      { xp: 0, streak: 0, lastPracticeDate: null },
      dayScore(DAY, true, 2),
    )

    const items = await repository.listItems("one")

    expect(items.map((item) => item.itemId).sort()).toEqual(["a", "b"])
  })

  it("adds up a day across exercises", async () => {
    const repository = createInMemoryProgressRepository()

    await repository.recordExercise(
      LEARNER,
      createItemState("a", NOW),
      { xp: 2, streak: 1, lastPracticeDate: DAY },
      dayScore(DAY, true, 2),
    )
    await repository.recordExercise(
      LEARNER,
      applyOutcome(createItemState("b", NOW), "incorrect", "neutral", NOW),
      { xp: 4, streak: 1, lastPracticeDate: DAY },
      dayScore(DAY, false, 2),
    )

    expect(await repository.listDays(LEARNER)).toEqual([
      { day: DAY, answers: 2, correct: 1, xp: 4 },
    ])
  })

  it("keeps days in order and learners apart", async () => {
    const repository = createInMemoryProgressRepository()

    await repository.recordExercise(
      LEARNER,
      createItemState("a", NOW),
      { xp: 0, streak: 0, lastPracticeDate: null },
      dayScore("2026-11-12", true, 2),
    )
    await repository.recordExercise(
      LEARNER,
      createItemState("b", NOW),
      { xp: 0, streak: 0, lastPracticeDate: null },
      dayScore("2026-11-10", true, 2),
    )
    await repository.recordExercise(
      "other",
      createItemState("c", NOW),
      { xp: 0, streak: 0, lastPracticeDate: null },
      dayScore("2026-11-11", true, 2),
    )

    const days = await repository.listDays(LEARNER)

    expect(days.map((day) => day.day)).toEqual(["2026-11-10", "2026-11-12"])
  })
})
