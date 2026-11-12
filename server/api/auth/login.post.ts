import { loginRequestSchema } from "#shared/api/schemas"

import { loginWithPassword } from "../../services/authService"

export default defineEventHandler(async (event) => {
  const body = loginRequestSchema.safeParse(await readBody(event))

  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: "Enter your email and password." })
  }

  return { user: await loginWithPassword(event, body.data) }
})
