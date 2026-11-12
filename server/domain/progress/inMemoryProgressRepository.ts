import type { ItemState } from "#shared/srs/types"

import { createLearnerProfile, type LearnerProfile } from "../srs/progress"

import type { LearnerItemState, PracticeDay, ProgressRepository } from "./repository"

/**
 * A repository that keeps everything in memory.
 *
 * Used by the tests, and by anyone running the app without a database.
 */
export function createInMemoryProgressRepository(): ProgressRepository {
  const profiles = new Map<string, LearnerProfile>()
  const items = new Map<string, ItemState>()
  const days = new Map<string, PracticeDay>()

  const key = (learnerId: string, itemId: string) => `${learnerId}::${itemId}`

  return {
    async loadProfile(learnerId) {
      const existing = profiles.get(learnerId)
      if (existing) return { ...existing }

      return createLearnerProfile()
    },

    async loadItem(learnerId, itemId) {
      const existing = items.get(key(learnerId, itemId))
      return existing ? { ...existing } : null
    },

    async loadState(learnerId, itemId): Promise<LearnerItemState> {
      const profile = profiles.get(learnerId)
      const item = items.get(key(learnerId, itemId))

      return {
        profile: profile ? { ...profile } : createLearnerProfile(),
        item: item ? { ...item } : null,
      }
    },

    async listItems(learnerId) {
      return [...items.entries()]
        .filter(([itemKey]) => itemKey.startsWith(`${learnerId}::`))
        .map(([, item]) => ({ ...item }))
    },

    async recordExercise(learnerId, item, profile, day) {
      items.set(key(learnerId, item.itemId), { ...item })
      profiles.set(learnerId, { ...profile })

      const dayKey = key(learnerId, day.date)
      const existing = days.get(dayKey) ?? { day: day.date, answers: 0, correct: 0, xp: 0 }

      days.set(dayKey, {
        day: day.date,
        answers: existing.answers + day.answers,
        correct: existing.correct + day.correct,
        xp: existing.xp + day.xp,
      })
    },

    async listDays(learnerId) {
      return [...days.entries()]
        .filter(([dayKey]) => dayKey.startsWith(`${learnerId}::`))
        .map(([, day]) => ({ ...day }))
        .sort((a, b) => (a.day < b.day ? -1 : 1))
    },

    async adoptProgress(fromLearnerId, toLearnerId) {
      if (fromLearnerId === toLearnerId) return

      const to = profiles.get(toLearnerId) ?? createLearnerProfile()
      profiles.set(toLearnerId, { ...to })

      const from = profiles.get(fromLearnerId)

      for (const [itemKey, state] of items) {
        if (!itemKey.startsWith(`${fromLearnerId}::`)) continue

        const targetKey = key(toLearnerId, state.itemId)
        const existing = items.get(targetKey)
        const incoming = state.lastReviewedAt ?? Number.NEGATIVE_INFINITY
        const current = existing?.lastReviewedAt ?? Number.NEGATIVE_INFINITY

        if (!existing || incoming >= current) {
          items.set(targetKey, { ...state })
        }

        items.delete(itemKey)
      }

      for (const [dayKey, day] of days) {
        if (!dayKey.startsWith(`${fromLearnerId}::`)) continue

        const targetKey = key(toLearnerId, day.day)
        const existing = days.get(targetKey) ?? { day: day.day, answers: 0, correct: 0, xp: 0 }

        days.set(targetKey, {
          day: day.day,
          answers: existing.answers + day.answers,
          correct: existing.correct + day.correct,
          xp: existing.xp + day.xp,
        })

        days.delete(dayKey)
      }

      const from = profiles.get(fromLearnerId)
      const to = profiles.get(toLearnerId) ?? createLearnerProfile()

      if (from) {
        profiles.set(toLearnerId, {
          xp: to.xp + from.xp,
          streak: Math.max(to.streak, from.streak),
          lastPracticeDate:
            to.lastPracticeDate !== null &&
            (from.lastPracticeDate === null || to.lastPracticeDate > from.lastPracticeDate)
              ? to.lastPracticeDate
              : from.lastPracticeDate,
        })
        profiles.delete(fromLearnerId)
      }
    },
  }
}
