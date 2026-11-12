import { randomUUID } from "node:crypto"
import type { H3Event } from "h3"

import { hashPassword, verifyPassword } from "../domain/auth/password"
import { allowAttempt } from "../domain/auth/rateLimit"
import {
  hashSessionToken,
  newSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "../domain/auth/session"
import type { User } from "../domain/auth/repository"
import { getAuthRepository } from "../db/authRepository"
import { getProgressRepository } from "../db/progressRepository"
import {
  clearAnonymousLearnerId,
  getAnonymousLearnerId,
} from "./learnerService"

/** Ten tries per ten minutes per address. Enough for a human, boring for a script. */
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 10 * 60 * 1000

/** A wrong password still costs a scrypt run, so timing says nothing about the email. */
const DUMMY_HASH =
  "$scrypt$N=16384,r=8,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function displayNameFor(email: string, wanted?: string): string {
  const clean = (wanted ?? "").trim()
  if (clean) return clean.slice(0, 40)

  const local = email.split("@")[0] ?? "learner"
  const first = local.split(/[._-]+/).filter(Boolean)[0] ?? "learner"

  return (first[0]?.toUpperCase() ?? "L") + first.slice(1, 40)
}

function setSessionCookie(event: H3Event, token: string): void {
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    // Cookies flagged Secure never reach a plain-http dev server, so the
    // flag follows the environment: on in production, off on localhost.
    secure: process.env.NODE_ENV === "production",
  })
}

function toUserPayload(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    hasPassword: user.hasPassword,
    hasGoogle: user.hasGoogle,
    createdAt: user.createdAt,
  }
}

/**
 * Move the anonymous cookie's progress into the account, then forget it.
 *
 * A fresh account has nothing to conflict with, so signup is a pure move. A
 * returning account keeps the better of each item and the summed days: the
 * histories are disjoint by construction, because a merged cookie is
 * cleared and the next anonymous id starts empty.
 */
async function mergeAnonymousProgress(event: H3Event, userId: string): Promise<void> {
  const anonymousId = getAnonymousLearnerId(event)
  if (!anonymousId || anonymousId === userId) return

  const repository = await getProgressRepository()
  await repository.adoptProgress(anonymousId, userId)
  clearAnonymousLearnerId(event)
}

async function startSession(event: H3Event, userId: string): Promise<void> {
  const repository = await getAuthRepository()
  const { token, tokenHash } = newSessionToken()

  await repository.createSession(tokenHash, userId, Date.now() + SESSION_TTL_MS)
  setSessionCookie(event, token)
}

function rateLimited(ip: string, scope: string): boolean {
  return !allowAttempt(`${scope}:${ip}`, RATE_LIMIT, RATE_WINDOW_MS, Date.now())
}

function clientIp(event: H3Event): string {
  return getRequestIP(event, { xForwardedFor: true }) ?? "unknown"
}

/** Create the account, move the anonymous progress into it, sign in. */
export async function signupWithPassword(
  event: H3Event,
  input: { email: string; password: string; displayName?: string },
) {
  if (rateLimited(clientIp(event), "signup")) {
    throw createError({ statusCode: 429, statusMessage: "Too many tries. Wait a few minutes." })
  }

  const email = input.email.trim()
  const emailNorm = normalizeEmail(email)
  const repository = await getAuthRepository()

  const existing = await repository.findUserByEmailNorm(emailNorm)
  if (existing) {
    // Said plainly on purpose: inventing a success here would leave a real
    // person staring at an inbox that stays empty.
    throw createError({
      statusCode: 409,
      statusMessage: "An account with this email already exists. Try logging in.",
    })
  }

  const user = await repository.createUser({
    id: randomUUID(),
    email,
    displayName: displayNameFor(email, input.displayName),
    passwordHash: hashPassword(input.password),
    googleSub: null,
    emailVerified: false,
  })

  await mergeAnonymousProgress(event, user.id)
  await startSession(event, user.id)

  return toUserPayload(user)
}

/** Check the password, move the anonymous progress in, sign in. */
export async function loginWithPassword(event: H3Event, input: { email: string; password: string }) {
  if (rateLimited(clientIp(event), "login")) {
    throw createError({ statusCode: 429, statusMessage: "Too many tries. Wait a few minutes." })
  }

  const emailNorm = normalizeEmail(input.email)
  const repository = await getAuthRepository()

  const row = await repository.findUserByEmailNorm(emailNorm)
  const matches = row?.passwordHash
    ? verifyPassword(input.password, row.passwordHash)
    : verifyPassword(input.password, DUMMY_HASH)

  if (!row || !row.passwordHash || !matches) {
    // One message for every failure: a wrong email and a wrong password
    // look exactly the same from the outside.
    throw createError({ statusCode: 401, statusMessage: "Invalid email or password." })
  }

  await mergeAnonymousProgress(event, row.id)
  await startSession(event, row.id)

  return toUserPayload({ ...row })
}

/** End this session. Other devices stay signed in. */
export async function logout(event: H3Event): Promise<void> {
  const token = getCookie(event, SESSION_COOKIE)
  if (token) {
    const repository = await getAuthRepository()
    await repository.deleteSession(hashSessionToken(token))
  }

  deleteCookie(event, SESSION_COOKIE, { path: "/" })
}

/** The signed-in user, or null for an anonymous learner. */
export async function currentUser(event: H3Event) {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return null

  const repository = await getAuthRepository()
  const session = await repository.loadSession(hashSessionToken(token), Date.now())
  if (!session) return null

  const row = await repository.findUserById(session.userId)
  if (!row) return null

  return toUserPayload(row)
}

/** Which ways in are switched on. Password always is. */
export function availableMethods() {
  return {
    password: true,
    magic: process.env.NODE_ENV !== "production" || Boolean(process.env.RESEND_API_KEY),
    google: Boolean(process.env.GOOGLE_CLIENT_ID),
  }
}
