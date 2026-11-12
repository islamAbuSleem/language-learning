import type { Sql } from "postgres"

import type { ProgressRepository } from "../domain/progress/repository"
import { createLearnerProfile, type LearnerProfile } from "../domain/srs/progress"
import type { ItemState } from "#shared/srs/types"

interface LearnerRow {
  id: string
  xp: number
  streak: number
  last_practice_date: string | null
}

interface ItemRow {
  item_id: string
  mastery: number
  reps: number
  lapses: number
  stability: number
  due_at: string | number
  last_reviewed_at: string | number | null
}

/**
 * Progress in Postgres.
 *
 * The learner row is created on first sight, so a new browser gets a profile
 * without an account, a sign-up or a migration step.
 */
export function createPostgresProgressRepository(sql: Sql): ProgressRepository {
  return {
    async loadProfile(learnerId: string): Promise<LearnerProfile> {
      await sql`
        INSERT INTO learners (id) VALUES (${learnerId})
        ON CONFLICT (id) DO NOTHING
      `

      const rows = await sql<LearnerRow[]>`
        SELECT id, xp, streak, last_practice_date
        FROM learners
        WHERE id = ${learnerId}
      `

      const row = rows[0]
      if (!row) return createLearnerProfile()

      return {
        xp: row.xp,
        streak: row.streak,
        lastPracticeDate: row.last_practice_date,
      }
    },

    async saveProfile(learnerId: string, profile: LearnerProfile): Promise<void> {
      await sql`
        INSERT INTO learners (id, xp, streak, last_practice_date, updated_at)
        VALUES (
          ${learnerId},
          ${profile.xp},
          ${profile.streak},
          ${profile.lastPracticeDate},
          now()
        )
        ON CONFLICT (id) DO UPDATE SET
          xp = EXCLUDED.xp,
          streak = EXCLUDED.streak,
          last_practice_date = EXCLUDED.last_practice_date,
          updated_at = now()
      `
    },

    async loadItem(learnerId: string, itemId: string): Promise<ItemState | null> {
      const rows = await sql<ItemRow[]>`
        SELECT item_id, mastery, reps, lapses, stability, due_at, last_reviewed_at
        FROM item_states
        WHERE learner_id = ${learnerId} AND item_id = ${itemId}
      `

      const row = rows[0]
      if (!row) return null

      return {
        itemId: row.item_id,
        mastery: row.mastery,
        reps: row.reps,
        lapses: row.lapses,
        stability: row.stability,
        dueAt: Number(row.due_at),
        lastReviewedAt: row.last_reviewed_at === null ? null : Number(row.last_reviewed_at),
      }
    },

    async saveItem(learnerId: string, item: ItemState): Promise<void> {
      await sql`
        INSERT INTO learners (id) VALUES (${learnerId})
        ON CONFLICT (id) DO NOTHING
      `

      await sql`
        INSERT INTO item_states (
          learner_id, item_id, mastery, reps, lapses, stability, due_at, last_reviewed_at
        )
        VALUES (
          ${learnerId},
          ${item.itemId},
          ${item.mastery},
          ${item.reps},
          ${item.lapses},
          ${item.stability},
          ${item.dueAt},
          ${item.lastReviewedAt}
        )
        ON CONFLICT (learner_id, item_id) DO UPDATE SET
          mastery = EXCLUDED.mastery,
          reps = EXCLUDED.reps,
          lapses = EXCLUDED.lapses,
          stability = EXCLUDED.stability,
          due_at = EXCLUDED.due_at,
          last_reviewed_at = EXCLUDED.last_reviewed_at
      `
    },

    async listItems(learnerId: string): Promise<ItemState[]> {
      const rows = await sql<ItemRow[]>`
        SELECT item_id, mastery, reps, lapses, stability, due_at, last_reviewed_at
        FROM item_states
        WHERE learner_id = ${learnerId}
        ORDER BY item_id
      `

      return rows.map((row) => ({
        itemId: row.item_id,
        mastery: row.mastery,
        reps: row.reps,
        lapses: row.lapses,
        stability: row.stability,
        dueAt: Number(row.due_at),
        lastReviewedAt: row.last_reviewed_at === null ? null : Number(row.last_reviewed_at),
      }))
    },
  }
}
