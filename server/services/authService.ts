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
import { sendMagicLink } from "./mailer"

/** Ten tries per ten minutes per address. Enough for a human, boring for a script. */
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 10 * 60 * 1000

/** A magic link lives fifteen minutes and works once. */
export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000

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

/**
 * Send a sign-in link.
 *
 * The address gets an account if it does not have one yet: a link proves
 * ownership of the inbox, which is all an account needs to start. Five links
 * an hour per address; asking for a sixth changes nothing.
 *
 * In development the link comes back in the response so a test can follow
 * it. In production only the mailbox has it.
 */
export async function requestMagicLink(
  event: H3Event,
  input: { email: string },
): Promise<{ sent: boolean; link?: string }> {
  const email = input.email.trim()
  const emailNorm = normalizeEmail(email)

  if (
    !allowAttempt(`magic:${emailNorm}`, 5, 60 * 60 * 1000, Date.now()) ||
    rateLimited(clientIp(event), "magic")
  ) {
    throw createError({ statusCode: 429, statusMessage: "Too many tries. Wait a while." })
  }

  const repository = await getAuthRepository()
  const { token, tokenHash } = newSessionToken()

  await repository.createMagicLink(tokenHash, emailNorm, Date.now() + MAGIC_LINK_TTL_MS)

  const origin = getRequestURL(event).origin
  const link = `${origin}/api/auth/magic?token=${token}`
  const { sent } = await sendMagicLink(email, link)

  return sent ? { sent } : { sent, link }
}

/**
 * Redeem a sign-in link: one account per inbox, progress merged in.
 *
 * A link for an unknown address creates the account on the spot. A link for
 * a known one signs it in. Either way the anonymous progress in this browser
 * joins it, and the link dies on use.
 */
export async function redeemMagicLink(event: H3Event, token: string): Promise<User> {
  const repository = await getAuthRepository()
  const link = await repository.consumeMagicLink(hashSessionToken(token), Date.now())

  if (!link) {
    throw createError({ statusCode: 410, statusMessage: "That link is used up or expired." })
  }

  let row = await repository.findUserByEmailNorm(link.emailNorm)

  if (!row) {
    // The inbox proved itself, so the account starts verified.
    row = await repository.createUser({
      id: randomUUID(),
      email: link.emailNorm,
      displayName: displayNameFor(link.emailNorm),
      passwordHash: null,
      googleSub: null,
      emailVerified: true,
    })
  } else if (!row.emailVerified) {
    await repository.markEmailVerified(row.id)
    row = { ...row, emailVerified: true }
  }

  await mergeAnonymousProgress(event, row.id)
  await startSession(event, row.id)

  return toUserPayload(row)
}
