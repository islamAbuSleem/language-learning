import { randomBytes, timingSafeEqual } from "node:crypto"
import type { H3Event } from "h3"
import { createError, deleteCookie, getCookie, getRequestURL, setCookie } from "h3"

/**
 * Google sign-in, as a standard confidential-client code flow.
 *
 * Needs three environment variables, all documented in .env.example:
 * GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and optionally GOOGLE_REDIRECT_URL
 * (which defaults to this deployment's own callback URL). Without the client
 * id the button never renders; the routes below refuse plainly instead of
 * half-working.
 *
 * The state cookie binds the callback to the browser that started it: ten
 * minutes, httpOnly, gone after use.
 */

const STATE_COOKIE = "oauth_state"
const STATE_TTL_MS = 10 * 60 * 1000

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID)
}

function redirectUri(event: H3Event): string {
  const override = process.env.GOOGLE_REDIRECT_URL
  if (override) return override

  return `${getRequestURL(event).origin}/api/auth/google/callback`
}

/** Where the browser goes to pick its Google account. */
export function googleStart(event: H3Event): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    throw createError({ statusCode: 500, statusMessage: "Google sign-in is not configured." })
  }

  const state = randomBytes(16).toString("hex")

  setCookie(event, STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(STATE_TTL_MS / 1000),
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(event),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

interface GoogleTokens {
  access_token: string
  id_token?: string
}

interface GoogleProfile {
  sub: string
  email: string
  email_verified: boolean
  name?: string
}

/** What the callback needs from Google: tokens, then the profile. */
export async function fetchGoogleProfile(
  code: string,
  redirectUri: string,
): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw createError({ statusCode: 500, statusMessage: "Google sign-in is not configured." })
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  })

  if (!tokenResponse.ok) {
    throw createError({ statusCode: 502, statusMessage: "Google did not accept the sign-in. Try again." })
  }

  const tokens = (await tokenResponse.json()) as GoogleTokens
  if (!tokens.access_token) {
    throw createError({ statusCode: 502, statusMessage: "Google did not accept the sign-in. Try again." })
  }

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })

  if (!profileResponse.ok) {
    throw createError({ statusCode: 502, statusMessage: "Google did not return a profile. Try again." })
  }

  const profile = (await profileResponse.json()) as Partial<GoogleProfile>
  if (!profile.sub || !profile.email) {
    throw createError({ statusCode: 502, statusMessage: "Google did not return a profile. Try again." })
  }

  return {
    sub: profile.sub,
    email: profile.email,
    emailVerified: profile.email_verified === true,
    name: typeof profile.name === "string" ? profile.name : undefined,
  }
}

/** The state the browser must echo back, or nobody is signed in. */
export function readOAuthState(event: H3Event): string | null {
  const state = getCookie(event, STATE_COOKIE)
  return state && state.length > 0 ? state : null
}

export function clearOAuthState(event: H3Event): void {
  deleteCookie(event, STATE_COOKIE, { path: "/" })
}

/**
 * Compare the echoed state with the one that was set, in constant time.
 *
 * A wrong length fails closed before the comparison, so nothing about the
 * real state leaks through timing.
 */
export function validOAuthState(expected: string | null, actual: unknown): boolean {
  if (!expected || typeof actual !== "string") return false
  if (expected.length !== actual.length) return false

  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
}
