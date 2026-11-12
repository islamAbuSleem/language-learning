import { randomUUID } from "node:crypto"
import type { H3Event } from "h3"

/**
 * Who the learner is.
 *
 * There are no accounts yet. The learner id lives in a cookie, so two browsers
 * get two profiles and progress survives a restart. Signing in later means
 * replacing this file, not the rest of the app.
 */
const COOKIE_NAME = "learner"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function getLearnerId(event: H3Event): string {
  const existing = getCookie(event, COOKIE_NAME)
  if (existing && existing.length > 0) return existing

  const learnerId = randomUUID()

  setCookie(event, COOKIE_NAME, learnerId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  })

  return learnerId
}
