import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { createPostgresProgressRepository } from "../../server/db/postgresProgressRepository"
import { applyOutcome, createItemState } from "../../server/domain/srs/mastery"

const url = process.env.DATABASE_URL
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const statements = JSON.parse(
  readFileSync(join(root, "server", "db", "schema.json"), "utf8"),
) as string[]

/**
 * The real database, when one is configured.
 *
 * These are the only tests that can catch a broken query, so they matter:
 * the unit tests use the in-memory repository and never touch SQL.
 *
 *   node --env-file=.env node_modules/vitest/vitest.mjs run tests/progress/postgres.test.ts
 */
describe.skipIf(!url)("the postgres repository", () => {
  const learnerId = `test-${randomUUID()}`
  const itemId = "es/a1/u1/select/cafe"

  async function withRepository<T>(
    run: (repository: ReturnType<typeof createPostgresProgressRepository>) => Promise<T>,
  ): Promise<T> {
    const { default: postgres } = await import("postgres")
    const sql = postgres(url as string, { ssl: "require", max: 1, onnotice: () => {} })

    try {
      for (const statement of statements) {
        await sql.unsafe(statement)
      }

      return await run(createPostgresProgressRepository(sql))
    } finally {
      await sql`DELETE FROM item_states WHERE learner_id = ${learnerId}`
      await sql`DELETE FROM learners WHERE id = ${learnerId}`
      await sql.end({ timeout: 5 })
    }
  }

  it(
    "creates a learner on the first write and reads it back",
    async () => {
      await withRepository(async (repository) => {
        const item = createItemState(itemId, 1_760_000_000_000)

        await repository.recordExercise(learnerId, item, {
          xp: 2,
          streak: 1,
          lastPracticeDate: "2026-11-12",
        }, { date: "2026-11-12", answers: 1, correct: 1, xp: 2 })

        const profile = await repository.loadProfile(learnerId)
        expect(profile.xp).toBe(2)
        expect(profile.streak).toBe(1)
        expect(profile.lastPracticeDate).toBe("2026-11-12")
      })
    },
    30_000,
  )

  it(
    "round-trips an item's memory state",
    async () => {
      await withRepository(async (repository) => {
        const item = applyOutcome(
          createItemState(itemId, 1_760_000_000_000),
          "correct",
          "too_easy",
          1_760_000_000_000,
        )

        await repository.recordExercise(learnerId, item, {
          xp: 2,
          streak: 1,
          lastPracticeDate: "2026-11-12",
        }, { date: "2026-11-12", answers: 1, correct: 1, xp: 2 })
        const loaded = await repository.loadItem(learnerId, itemId)

        expect(loaded?.itemId).toBe(item.itemId)
        expect(loaded?.mastery).toBe(item.mastery)
        expect(loaded?.reps).toBe(item.reps)
        expect(loaded?.dueAt).toBe(item.dueAt)
      })
    },
    30_000,
  )

  it(
    "updates an item instead of duplicating it",
    async () => {
      await withRepository(async (repository) => {
        await repository.recordExercise(learnerId, createItemState(itemId, 1), {
          xp: 2,
          streak: 1,
          lastPracticeDate: "2026-11-12",
        }, { date: "2026-11-12", answers: 1, correct: 1, xp: 2 })
        await repository.recordExercise(
          learnerId,
          applyOutcome(createItemState(itemId, 1), "correct", "too_easy", 1),
          { xp: 4, streak: 1, lastPracticeDate: "2026-11-12" },
          { date: "2026-11-12", answers: 1, correct: 1, xp: 2 },
        )

        const items = await repository.listItems(learnerId)
        expect(items).toHaveLength(1)
        expect(items[0]?.mastery).toBeCloseTo(0.3)
      })
    },
    30_000,
  )

  it(
    "lists the learner's items",
    async () => {
      await withRepository(async (repository) => {
        await repository.recordExercise(learnerId, createItemState("a", 1), {
          xp: 0,
          streak: 0,
          lastPracticeDate: null,
        }, { date: "2026-11-12", answers: 1, correct: 0, xp: 0 })
        await repository.recordExercise(learnerId, createItemState("b", 2), {
          xp: 0,
          streak: 0,
          lastPracticeDate: null,
        }, { date: "2026-11-12", answers: 1, correct: 1, xp: 2 })

        const items = await repository.listItems(learnerId)

        expect(items.map((item) => item.itemId).sort()).toEqual(["a", "b"])
      })
    },
    30_000,
  )

  it(
    "adds up a day across exercises",
    async () => {
      await withRepository(async (repository) => {
        await repository.recordExercise(learnerId, createItemState("a", 1), {
          xp: 2,
          streak: 1,
          lastPracticeDate: "2026-11-12",
        }, { date: "2026-11-12", answers: 1, correct: 1, xp: 2 })
        await repository.recordExercise(learnerId, createItemState("b", 2), {
          xp: 4,
          streak: 1,
          lastPracticeDate: "2026-11-12",
        }, { date: "2026-11-12", answers: 1, correct: 0, xp: 2 })

        expect(await repository.listDays(learnerId)).toEqual([
          { day: "2026-11-12", answers: 2, correct: 1, xp: 4 },
        ])
      })
    },
    30_000,
  )
})
