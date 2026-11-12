import { describe, expect, it } from "vitest"

import { createInMemoryAuthRepository } from "../../server/domain/auth/inMemoryAuthRepository"
import { hashPassword, verifyPassword } from "../../server/domain/auth/password"
import { allowAttempt, resetRateLimits } from "../../server/domain/auth/rateLimit"
import {
  hashSessionToken,
  newSessionToken,
  SESSION_TTL_MS,
} from "../../server/domain/auth/session"

describe("passwords", () => {
  it("round-trips", () => {
    const hash = hashPassword("correct horse")

    expect(verifyPassword("correct horse", hash)).toBe(true)
    expect(verifyPassword("wrong horse", hash)).toBe(false)
  })

  it("salts every hash", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"))
  })

  it("rejects an empty or corrupt hash without throwing", () => {
    expect(verifyPassword("anything", "")).toBe(false)
    expect(verifyPassword("anything", "not-a-hash")).toBe(false)
    expect(verifyPassword("anything", "$scrypt$nope$salt$hash")).toBe(false)
  })
})

describe("session tokens", () => {
  it("are unique, and only the hash is stored", () => {
    const first = newSessionToken()
    const second = newSessionToken()

    expect(first.token).not.toBe(second.token)
    expect(first.tokenHash).toBe(hashSessionToken(first.token))
    expect(first.token).not.toContain(first.tokenHash)
  })

  it("last thirty days", () => {
    expect(SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000)
  })
})

describe("rate limits", () => {
  it("allows a burst, then refuses until the window passes", () => {
    resetRateLimits()

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(allowAttempt("login:1.2.3.4", 10, 60_000, 1_000)).toBe(true)
    }
    expect(allowAttempt("login:1.2.3.4", 10, 60_000, 1_001)).toBe(false)
    expect(allowAttempt("login:1.2.3.4", 10, 60_000, 61_001)).toBe(true)
  })

  it("keeps keys apart", () => {
    resetRateLimits()

    for (let attempt = 0; attempt < 10; attempt += 1) {
      allowAttempt("login:1.2.3.4", 10, 60_000, 1_000)
    }

    expect(allowAttempt("login:5.6.7.8", 10, 60_000, 1_000)).toBe(true)
  })
})

describe("the auth repository", () => {
  it("creates a user and finds them by email, case-insensitively", async () => {
    const repository = createInMemoryAuthRepository()

    const user = await repository.createUser({
      id: "u1",
      email: "Learner@Example.com",
      displayName: "Learner",
      passwordHash: "hash",
      googleSub: null,
      emailVerified: false,
    })

    expect(user.hasPassword).toBe(true)
    expect(user.hasGoogle).toBe(false)

    const found = await repository.findUserByEmailNorm("learner@example.com")

    expect(found?.id).toBe("u1")
    expect(await repository.findUserByEmailNorm("nobody@example.com")).toBeNull()
  })

  it("resolves a session until it expires", async () => {
    const repository = createInMemoryAuthRepository()
    const { tokenHash } = newSessionToken()

    await repository.createSession(tokenHash, "u1", 2_000)

    expect(await repository.loadSession(tokenHash, 1_000)).toEqual({ userId: "u1", expiresAt: 2_000 })
    expect(await repository.loadSession(tokenHash, 2_000)).toBeNull()
  })

  it("consumes a magic link once", async () => {
    const repository = createInMemoryAuthRepository()

    await repository.createMagicLink("hash", "learner@example.com", 2_000)

    expect(await repository.consumeMagicLink("hash", 1_000)).toMatchObject({
      emailNorm: "learner@example.com",
    })
    expect(await repository.consumeMagicLink("hash", 1_000)).toBeNull()
    expect(await repository.consumeMagicLink("missing", 1_000)).toBeNull()
  })

  it("forgets one session or all of them", async () => {
    const repository = createInMemoryAuthRepository()
    const first = newSessionToken()
    const second = newSessionToken()

    await repository.createSession(first.tokenHash, "u1", 9_999_999)
    await repository.createSession(second.tokenHash, "u1", 9_999_999)
    await repository.deleteSession(first.tokenHash)

    expect(await repository.loadSession(first.tokenHash, 1)).toBeNull()
    expect(await repository.loadSession(second.tokenHash, 1)).not.toBeNull()

    await repository.deleteUserSessions("u1")

    expect(await repository.loadSession(second.tokenHash, 1)).toBeNull()
  })
})
