import { redeemMagicLink } from "../../services/authService"

export default defineEventHandler(async (event) => {
  const token = getQuery(event).token

  if (typeof token !== "string" || token.length === 0) {
    return sendRedirect(event, "/login?magic=invalid")
  }

  try {
    await redeemMagicLink(event, token)
  } catch {
    return sendRedirect(event, "/login?magic=invalid")
  }

  return sendRedirect(event, "/")
})
