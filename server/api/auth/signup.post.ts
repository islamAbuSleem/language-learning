import { signupRequestSchema } from "#shared/api/schemas"

import { signupWithPassword } from "../../services/authService"

export default defineEventHandler(async (event) => {
  const body = signupRequestSchema.safeParse(await readBody(event))

  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: "Enter a valid email and a password of at least 8 characters." })
  }

  return { user: await signupWithPassword(event, body.data) }
})
