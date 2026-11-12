import { profileUpdateSchema } from "#shared/api/schemas"

import { updateDisplayName } from "../../services/authService"

export default defineEventHandler(async (event) => {
  const body = profileUpdateSchema.safeParse(await readBody(event))

  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: "Give yourself a name." })
  }

  return { user: await updateDisplayName(event, body.data.displayName) }
})
