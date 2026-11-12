import { magicRequestSchema } from "#shared/api/schemas"

import { requestMagicLink } from "../../services/authService"

export default defineEventHandler(async (event) => {
  const body = magicRequestSchema.safeParse(await readBody(event))

  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: "Enter your email." })
  }

  return requestMagicLink(event, body.data)
})
