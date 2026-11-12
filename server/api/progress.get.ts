import { getEffectiveLearnerId } from "../services/learnerService"
import { listItemStates, getProfile } from "../services/progressService"

export default defineEventHandler(async (event) => {
  const learnerId = await getEffectiveLearnerId(event)

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
