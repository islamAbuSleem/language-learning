import type { AuthRepository, MagicLink, Session, User, UserRow } from "./repository"

/**
 * Accounts kept in memory.
 *
 * Used by the tests. The Postgres implementation is the one that ships.
 */
export function createInMemoryAuthRepository(): AuthRepository {
  const users = new Map<string, UserRow>()
  const sessions = new Map<string, Session & { tokenHash: string }>()
  const links = new Map<string, MagicLink & { tokenHash: string }>()

  function publicUser(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      emailVerified: row.emailVerified,
      hasPassword: row.passwordHash !== null,
      hasGoogle: row.googleSub !== null,
      createdAt: row.createdAt,
    }
  }

  return {
    async createUser(input) {
      const row: UserRow = {
        id: input.id,
        email: input.email,
        displayName: input.displayName,
        emailVerified: input.emailVerified,
        hasPassword: input.passwordHash !== null,
        hasGoogle: input.googleSub !== null,
        createdAt: new Date().toISOString(),
        passwordHash: input.passwordHash,
        googleSub: input.googleSub,
      }

      users.set(row.id, row)

      return publicUser(row)
    },

    async findUserByEmailNorm(emailNorm) {
      for (const row of users.values()) {
        if (row.email.toLowerCase() === emailNorm) return { ...row }
      }

      return null
    },

    async findUserByGoogleSub(googleSub) {
      for (const row of users.values()) {
        if (row.googleSub === googleSub) return { ...row }
      }

      return null
    },

    async findUserById(userId) {
      const row = users.get(userId)
      return row ? { ...row } : null
    },

    async setDisplayName(userId, displayName) {
      const row = users.get(userId)
      if (row) users.set(userId, { ...row, displayName })
    },

    async setPasswordHash(userId, passwordHash) {
      const row = users.get(userId)
      if (!row) return

      users.set(userId, { ...row, passwordHash, hasPassword: true })
    },

    async linkGoogleAccount(userId, googleSub) {
      const row = users.get(userId)
      if (!row) return

      users.set(userId, { ...row, googleSub, hasGoogle: true, emailVerified: true })
    },

    async markEmailVerified(userId) {
      const row = users.get(userId)
      if (!row) return

      users.set(userId, { ...row, emailVerified: true })
    },

    async createSession(tokenHash, userId, expiresAt) {
      sessions.set(tokenHash, { tokenHash, userId, expiresAt })
    },

    async loadSession(tokenHash, now) {
      const session = sessions.get(tokenHash)
      if (!session || session.expiresAt <= now) return null

      return { userId: session.userId, expiresAt: session.expiresAt }
    },

    async deleteSession(tokenHash) {
      sessions.delete(tokenHash)
    },

    async deleteUserSessions(userId) {
      for (const [token, session] of sessions) {
        if (session.userId === userId) sessions.delete(token)
      }
    },

    async createMagicLink(tokenHash, emailNorm, expiresAt) {
      links.set(tokenHash, { tokenHash, emailNorm, expiresAt, consumedAt: null })
    },

    async consumeMagicLink(tokenHash, now) {
      const link = links.get(tokenHash)
      if (!link || link.consumedAt !== null || link.expiresAt <= now) return null

      links.set(tokenHash, { ...link, consumedAt: now })

      return { emailNorm: link.emailNorm, expiresAt: link.expiresAt, consumedAt: now }
    },
  }
}
