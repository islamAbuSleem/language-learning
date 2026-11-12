import type { ItemState } from "#shared/srs/types"

import type { LearnerProfile } from "../srs/progress"

/**
 * Where progress lives.
 *
 * The SRS engine never touches a database: it works on plain values, and this
 * interface is the only seam. Swapping Neon for something else means writing
 * another implementation, not touching the scheduling logic.
 */
export interface ProgressRepository {
  /** The learner profile, created empty if the learner is new. */
  loadProfile(learnerId: string): Promise<LearnerProfile>
  saveProfile(learnerId: string, profile: LearnerProfile): Promise<void>
  /** One item's memory state, or null if the learner has never met it. */
  loadItem(learnerId: string, itemId: string): Promise<ItemState | null>
  saveItem(learnerId: string, item: ItemState): Promise<void>
  /** Every item the learner has met. */
  listItems(learnerId: string): Promise<ItemState[]>
}
