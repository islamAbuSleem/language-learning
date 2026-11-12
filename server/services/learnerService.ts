import { randomUUID } from "node:crypto"
import type { H3Event } from "h3"
import { deleteCookie, getCookie, setCookie } from "h3"

import { SESSION_COOKIE, hashSessionToken } from "../domain/auth/session"
import { getAuthRepository } from "../db/authRepository"

/**
 * Who the learner is.
 *
 * A signed-in learner is their user id: the session cookie points at it, and
 * everything built on this function keeps working unchanged. Everyone else
 * is an anonymous id in a cookie, exactly as before — signing in merges that
 * progress into the account instead of stranding it.
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

/** The anonymous id waiting to be merged, if there is one. */
export function getAnonymousLearnerId(event: H3Event): string | null {
  const existing = getCookie(event, COOKIE_NAME)
  if (existing && existing.length > 0) return existing

  return null
}

/** Forget the anonymous id. Used after its progress joins an account. */
export function clearAnonymousLearnerId(event: H3Event): void {
  deleteCookie(event, COOKIE_NAME, { path: "/" })
}

/**
 * The signed-in user, if the session cookie points at a live session.
 *
 * Anonymous learners get null here and keep flowing through getLearnerId;
 * nothing about them changes.
 */
export async function getSessionUser(event: H3Event): Promise<{ id: string } | null> {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return null

  const repository = await getAuthRepository()
  const session = await repository.loadSession(hashSessionToken(token), Date.now())
  if (!session) return null

  return { id: session.userId }
}

/**
 * The id progress is written under: the account when signed in, the
 * anonymous cookie otherwise.
 */
export async function getEffectiveLearnerId(event: H3Event): Promise<string> {
  const user = await getSessionUser(event)
  if (user) return user.id

  return getLearnerId(event)
}
