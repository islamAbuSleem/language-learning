import type { Sql } from "postgres"

import type { ProgressRepository, DayScore, PracticeDay } from "../domain/progress/repository"
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
 * A round trip to Neon costs roughly a third of a second from here, so the
 * write path is kept to one statement: the learner upsert is a CTE that the
 * item insert reads from, which keeps the foreign key satisfied and both
 * writes in one round trip.
 */
export function createPostgresProgressRepository(sql: Sql): ProgressRepository {
  return {
    async loadProfile(learnerId: string): Promise<LearnerProfile> {
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

    async loadState(learnerId: string, itemId: string) {
      const rows = await sql<{ profile: LearnerRow | null; item: ItemRow | null }[]>`
        WITH p AS (
          SELECT id, xp, streak, last_practice_date
          FROM learners
          WHERE id = ${learnerId}
        ),
        i AS (
          SELECT item_id, mastery, reps, lapses, stability, due_at, last_reviewed_at
          FROM item_states
          WHERE learner_id = ${learnerId} AND item_id = ${itemId}
        )
        SELECT
          (SELECT row_to_json(p) FROM p) AS profile,
          (SELECT row_to_json(i) FROM i) AS item
      `

      const row = rows[0]
      const profile = row?.profile ?? null
      const item = row?.item ?? null

      return {
        profile: profile
          ? {
              xp: profile.xp,
              streak: profile.streak,
              lastPracticeDate: profile.last_practice_date,
            }
          : createLearnerProfile(),
        item: item
          ? {
              itemId: item.item_id,
              mastery: item.mastery,
              reps: item.reps,
              lapses: item.lapses,
              stability: item.stability,
              dueAt: Number(item.due_at),
              lastReviewedAt:
                item.last_reviewed_at === null ? null : Number(item.last_reviewed_at),
            }
          : null,
      }
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

    async listDays(learnerId: string): Promise<PracticeDay[]> {
      const rows = await sql<{ day: string; answers: number; correct: number; xp: number }[]>`
        SELECT day, answers, correct, xp
        FROM practice_days
        WHERE learner_id = ${learnerId}
        ORDER BY day
      `

      return rows.map((row) => ({
        day: row.day,
        answers: row.answers,
        correct: row.correct,
        xp: row.xp,
      }))
    },

    async adoptProgress(fromLearnerId: string, toLearnerId: string): Promise<void> {
      if (fromLearnerId === toLearnerId) return

      // The account may never have answered anything, in which case it has
      // no learner row yet — but the moved rows need a parent to point at.
      await sql`INSERT INTO learners (id) VALUES (${toLearnerId}) ON CONFLICT (id) DO NOTHING`

      await sql.begin(async (tx) => {
        // Per item the most recently reviewed state wins; a missing timestamp
        // counts as older than any real one.
        await tx`
          INSERT INTO item_states (learner_id, item_id, mastery, reps, lapses, stability, due_at, last_reviewed_at)
          SELECT ${toLearnerId}, item_id, mastery, reps, lapses, stability, due_at, last_reviewed_at
          FROM item_states
          WHERE learner_id = ${fromLearnerId}
          ON CONFLICT (learner_id, item_id) DO UPDATE SET
            mastery = CASE
              WHEN COALESCE(EXCLUDED.last_reviewed_at, -1) >= COALESCE(item_states.last_reviewed_at, -1)
              THEN EXCLUDED.mastery ELSE item_states.mastery END,
            reps = CASE
              WHEN COALESCE(EXCLUDED.last_reviewed_at, -1) >= COALESCE(item_states.last_reviewed_at, -1)
              THEN EXCLUDED.reps ELSE item_states.reps END,
            lapses = CASE
              WHEN COALESCE(EXCLUDED.last_reviewed_at, -1) >= COALESCE(item_states.last_reviewed_at, -1)
              THEN EXCLUDED.lapses ELSE item_states.lapses END,
            stability = CASE
              WHEN COALESCE(EXCLUDED.last_reviewed_at, -1) >= COALESCE(item_states.last_reviewed_at, -1)
              THEN EXCLUDED.stability ELSE item_states.stability END,
            due_at = CASE
              WHEN COALESCE(EXCLUDED.last_reviewed_at, -1) >= COALESCE(item_states.last_reviewed_at, -1)
              THEN EXCLUDED.due_at ELSE item_states.due_at END,
            last_reviewed_at = CASE
              WHEN COALESCE(EXCLUDED.last_reviewed_at, -1) >= COALESCE(item_states.last_reviewed_at, -1)
              THEN EXCLUDED.last_reviewed_at ELSE item_states.last_reviewed_at END
        `
        await tx`DELETE FROM item_states WHERE learner_id = ${fromLearnerId}`

        // Per day the counts add up.
        await tx`
          INSERT INTO practice_days (learner_id, day, answers, correct, xp)
          SELECT ${toLearnerId}, day, answers, correct, xp
          FROM practice_days
          WHERE learner_id = ${fromLearnerId}
          ON CONFLICT (learner_id, day) DO UPDATE SET
            answers = practice_days.answers + EXCLUDED.answers,
            correct = practice_days.correct + EXCLUDED.correct,
            xp = practice_days.xp + EXCLUDED.xp
        `
        await tx`DELETE FROM practice_days WHERE learner_id = ${fromLearnerId}`

        // The profile keeps the summed XP with the longer streak. GREATEST
        // over text dates works because they are YYYY-MM-DD; the COALESCE
        // keeps a missing date from nulling the whole expression.
        await tx`
          UPDATE learners AS target SET
            xp = target.xp + source.xp,
            streak = GREATEST(target.streak, source.streak),
            last_practice_date = NULLIF(GREATEST(COALESCE(target.last_practice_date, ''), COALESCE(source.last_practice_date, '')), ''),
            updated_at = now()
          FROM learners AS source
          WHERE target.id = ${toLearnerId} AND source.id = ${fromLearnerId}
        `
        await tx`DELETE FROM learners WHERE id = ${fromLearnerId}`
      })
    },

    async recordExercise(
      learnerId: string,
      item: ItemState,
      profile: LearnerProfile,
      day: DayScore,
    ): Promise<void> {
      await sql`
        WITH learner AS (
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
          RETURNING id
        ),
        item_upsert AS (
          INSERT INTO item_states (
            learner_id, item_id, mastery, reps, lapses, stability, due_at, last_reviewed_at
          )
          SELECT
            id,
            ${item.itemId},
            ${item.mastery},
            ${item.reps},
            ${item.lapses},
            ${item.stability},
            ${item.dueAt},
            ${item.lastReviewedAt}
          FROM learner
          ON CONFLICT (learner_id, item_id) DO UPDATE SET
            mastery = EXCLUDED.mastery,
            reps = EXCLUDED.reps,
            lapses = EXCLUDED.lapses,
            stability = EXCLUDED.stability,
            due_at = EXCLUDED.due_at,
            last_reviewed_at = EXCLUDED.last_reviewed_at
          RETURNING learner_id
        )
        INSERT INTO practice_days (learner_id, day, answers, correct, xp)
        SELECT id, ${day.date}, ${day.answers}, ${day.correct}, ${day.xp}
        FROM learner
        ON CONFLICT (learner_id, day) DO UPDATE SET
          answers = practice_days.answers + EXCLUDED.answers,
          correct = practice_days.correct + EXCLUDED.correct,
          xp = practice_days.xp + EXCLUDED.xp
      `
    },
  }
}
