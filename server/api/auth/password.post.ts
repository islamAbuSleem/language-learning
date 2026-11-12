import { passwordSetSchema } from "#shared/api/schemas"

import { setAccountPassword } from "../../services/authService"

export default defineEventHandler(async (event) => {
  const body = passwordSetSchema.safeParse(await readBody(event))

  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: "Use at least 8 characters." })
  }

  return { user: await setAccountPassword(event, body.data) }
})
