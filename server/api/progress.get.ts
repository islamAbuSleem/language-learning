import { describeLearningProgress, errorGate } from "../domain/progress/gate"
import { getEffectiveLearnerId } from "../services/learnerService"
import { listItemStates, getProfile } from "../services/progressService"

export default defineEventHandler(async (event) => {
  const learnerId = await getEffectiveLearnerId(event)
  const states = await listItemStates(learnerId)

  // The percentage the learner sees: their errors against what they have
  // learned, and whether the path is waiting for those errors.
  const learning = describeLearningProgress(states)
  const gate = errorGate(learning)

  return {
    profile: await getProfile(learnerId),
    learning: { ...learning, ...gate },
    items: states.map((item) => ({
      itemId: item.itemId,
      mastery: item.mastery,
      stability: item.stability,
      dueAt: item.dueAt,
    })),
  }
})
