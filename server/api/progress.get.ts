import { currentLearnerId, getProfile, listItemStates } from "../services/progressService"

export default defineEventHandler(() => {
  const learnerId = currentLearnerId()

  return {
    profile: getProfile(learnerId),
    items: listItemStates(learnerId).map((item) => ({
      itemId: item.itemId,
      mastery: item.mastery,
      stability: item.stability,
      dueAt: item.dueAt,
    })),
  }
})
