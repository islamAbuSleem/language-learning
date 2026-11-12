import { completeGoogleSignIn } from "../../../services/authService"
import {
  clearOAuthState,
  fetchGoogleProfile,
  readOAuthState,
  validOAuthState,
} from "../../../services/googleAuth"

function redirectUri(event: H3Event): string {
  const override = process.env.GOOGLE_REDIRECT_URL
  if (override) return override

  return `${getRequestURL(event).origin}/api/auth/google/callback`
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const expected = readOAuthState(event)
  clearOAuthState(event)

  if (!validOAuthState(expected, query.state) || typeof query.code !== "string" || query.code.length === 0) {
    return sendRedirect(event, "/login?google=invalid")
  }

  try {
    await completeGoogleSignIn(event, await fetchGoogleProfile(query.code, redirectUri(event)))
  } catch {
    return sendRedirect(event, "/login?google=invalid")
  }

  return sendRedirect(event, "/")
})
