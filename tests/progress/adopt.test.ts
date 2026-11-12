import { describe, expect, it } from "vitest"

import { createInMemoryProgressRepository } from "../../server/domain/progress/inMemoryProgressRepository"
import { createItemState } from "../../server/domain/srs/mastery"

const NOW = 1_760_000_000_000

function state(itemId: string, mastery: number, reviewedAt: number | null) {
  return {
    ...createItemState(itemId, NOW),
    mastery,
    reps: 1,
    lapses: mastery < 0.9 ? 1 : 0,
    lastReviewedAt: reviewedAt,
  }
}

describe("adopting anonymous progress", () => {
  it("moves items, days and the profile, then forgets the old id", async () => {
    const repository = createInMemoryProgressRepository()

    await repository.recordExercise(
      "anon",
      state("es/a1/u1/select/a", 0.9, NOW),
      { xp: 6, streak: 2, lastPracticeDate: "2026-11-12" },
      { date: "2026-11-12", answers: 1, correct: 1, xp: 2 },
    )

    await repository.adoptProgress("anon", "user")

    expect(await repository.loadProfile("user")).toEqual({
      xp: 6,
      streak: 2,
      lastPracticeDate: "2026-11-12",
    })
    expect((await repository.loadItem("user", "es/a1/u1/select/a"))?.mastery).toBe(0.9)
    expect(await repository.listDays("user")).toEqual([
      { day: "2026-11-12", answers: 1, correct: 1, xp: 2 },
    ])
    expect(await repository.loadItem("anon", "es/a1/u1/select/a")).toBeNull()
    expect(await repository.listDays("anon")).toEqual([])
  })

  it("lets the most recently reviewed state win", async () => {
    const repository = createInMemoryProgressRepository()

    await repository.recordExercise(
      "user",
      state("es/a1/u1/select/a", 0.4, NOW - 1_000),
      { xp: 0, streak: 0, lastPracticeDate: null },
      { date: "2026-11-12", answers: 1, correct: 0, xp: 0 },
    )
    await repository.recordExercise(
      "anon",
      state("es/a1/u1/select/a", 0.9, NOW),
      { xp: 0, streak: 0, lastPracticeDate: null },
      { date: "2026-11-12", answers: 1, correct: 1, xp: 0 },
    )

    await repository.adoptProgress("anon", "user")

    expect((await repository.loadItem("user", "es/a1/u1/select/a"))?.mastery).toBe(0.9)
  })

  it("adds the days up and sums the xp", async () => {
    const repository = createInMemoryProgressRepository()

    await repository.recordExercise(
      "user",
      state("es/a1/u1/select/a", 0.9, NOW),
      { xp: 10, streak: 3, lastPracticeDate: "2026-11-12" },
      { date: "2026-11-12", answers: 2, correct: 2, xp: 4 },
    )
    await repository.recordExercise(
      "anon",
      state("es/a1/u1/select/b", 0.9, NOW),
      { xp: 6, streak: 5, lastPracticeDate: "2026-11-11" },
      { date: "2026-11-12", answers: 1, correct: 0, xp: 2 },
    )

    await repository.adoptProgress("anon", "user")

    expect(await repository.loadProfile("user")).toEqual({
      xp: 16,
      streak: 5,
      lastPracticeDate: "2026-11-12",
    })
    expect(await repository.listDays("user")).toEqual([
      { day: "2026-11-12", answers: 3, correct: 2, xp: 6 },
    ])
  })

  it("is a no-op when there is nothing to adopt", async () => {
    const repository = createInMemoryProgressRepository()

    await repository.adoptProgress("nobody", "user")

    expect(await repository.listDays("user")).toEqual([])
  })
})
