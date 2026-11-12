import { trackIdSchema } from "#shared/content/schema"

import { getLearnerId } from "../../services/learnerService"
import { getLearnerStats } from "../../services/statsService"

export default defineEventHandler(async (event) => {
  const track = trackIdSchema.safeParse(getRouterParam(event, "track"))

  if (!track.success) {
    throw createError({ statusCode: 400, statusMessage: "Unknown track" })
  }

  return getLearnerStats(track.data, getLearnerId(event), Date.now())
})
