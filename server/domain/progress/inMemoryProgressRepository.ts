import type { ItemState } from "#shared/srs/types"

import { createLearnerProfile, type LearnerProfile } from "../srs/progress"

import type { ProgressRepository } from "./repository"

/**
 * A repository that keeps everything in memory.
 *
 * Used by the tests, and by anyone running the app without a database.
 */
export function createInMemoryProgressRepository(): ProgressRepository {
  const profiles = new Map<string, LearnerProfile>()
  const items = new Map<string, ItemState>()

  const key = (learnerId: string, itemId: string) => `${learnerId}::${itemId}`

  return {
    async loadProfile(learnerId) {
      const existing = profiles.get(learnerId)
      if (existing) return { ...existing }

      const created = createLearnerProfile()
      profiles.set(learnerId, created)

      return { ...created }
    },

    async saveProfile(learnerId, profile) {
      profiles.set(learnerId, { ...profile })
    },

    async loadItem(learnerId, itemId) {
      const existing = items.get(key(learnerId, itemId))
      return existing ? { ...existing } : null
    },

    async saveItem(learnerId, item) {
      items.set(key(learnerId, item.itemId), { ...item })
    },

    async listItems(learnerId) {
      return [...items.entries()]
        .filter(([itemKey]) => itemKey.startsWith(`${learnerId}::`))
        .map(([, item]) => ({ ...item }))
    },
  }
}
