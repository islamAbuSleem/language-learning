import { createHash, randomBytes } from "node:crypto"

/** Thirty days, in milliseconds. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** The cookie that carries the session. Anonymous learners keep `learner`. */
export const SESSION_COOKIE = "session"

/**
 * A fresh session token.
 *
 * The token goes to the cookie; only its SHA-256 goes to the database, so a
 * read-only leak of the sessions table is not a login.
 */
export function newSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex")
  const tokenHash = createHash("sha256").update(token).digest("hex")

  return { token, tokenHash }
}

/** The SHA-256 of a presented token, for the database lookup. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}
