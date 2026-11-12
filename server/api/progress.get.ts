import { getLearnerId } from "../services/learnerService"
import { listItemStates, getProfile } from "../services/progressService"

export default defineEventHandler(async (event) => {
  const learnerId = getLearnerId(event)

  return {
    profile: await getProfile(learnerId),
    items: (await listItemStates(learnerId)).map((item) => ({
      itemId: item.itemId,
      mastery: item.mastery,
      stability: item.stability,
      dueAt: item.dueAt,
    })),
  }
})
