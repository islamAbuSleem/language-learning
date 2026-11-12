import type { Sql } from "postgres"

import type {
  AuthRepository,
  MagicLink,
  Session,
  User,
  UserRow,
} from "../domain/auth/repository"

interface UserRowResult {
  id: string
  email: string
  display_name: string
  email_verified: boolean
  password_hash: string | null
  google_sub: string | null
  created_at: Date
}

function toUserRow(row: UserRowResult): UserRow {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    emailVerified: row.email_verified,
    hasPassword: row.password_hash !== null,
    hasGoogle: row.google_sub !== null,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    passwordHash: row.password_hash,
    googleSub: row.google_sub,
  }
}

function toUser(row: UserRowResult): User {
  const full = toUserRow(row)

  return {
    id: full.id,
    email: full.email,
    displayName: full.displayName,
    emailVerified: full.emailVerified,
    hasPassword: full.hasPassword,
    hasGoogle: full.hasGoogle,
    createdAt: full.createdAt,
  }
}

/**
 * Accounts in Postgres.
 *
 * Secrets are stored hashed and compared in the domain layer, so this file
 * never sees a plain password or token — only their hashes.
 */
export function createPostgresAuthRepository(sql: Sql): AuthRepository {
  return {
    async createUser(input) {
      const rows = await sql<UserRowResult[]>`
        INSERT INTO users (id, email, email_norm, display_name, password_hash, google_sub, email_verified)
        VALUES (${input.id}, ${input.email}, ${input.email.toLowerCase()}, ${input.displayName}, ${input.passwordHash}, ${input.googleSub}, ${input.emailVerified})
        RETURNING id, email, display_name, email_verified, password_hash, google_sub, created_at
      `

      return toUser(rows[0] as UserRowResult)
    },

    async findUserByEmailNorm(emailNorm) {
      const rows = await sql<UserRowResult[]>`
        SELECT id, email, display_name, email_verified, password_hash, google_sub, created_at
        FROM users
        WHERE email_norm = ${emailNorm.toLowerCase()}
      `

      const row = rows[0]
      return row ? toUserRow(row) : null
    },

    async findUserByGoogleSub(googleSub) {
      const rows = await sql<UserRowResult[]>`
        SELECT id, email, display_name, email_verified, password_hash, google_sub, created_at
        FROM users
        WHERE google_sub = ${googleSub}
      `

      const row = rows[0]
      return row ? toUserRow(row) : null
    },

    async findUserById(userId) {
      const rows = await sql<UserRowResult[]>`
        SELECT id, email, display_name, email_verified, password_hash, google_sub, created_at
        FROM users
        WHERE id = ${userId}
      `

      const row = rows[0]
      return row ? toUserRow(row) : null
    },

    async setPasswordHash(userId, passwordHash) {
      await sql`
        UPDATE users SET password_hash = ${passwordHash}, updated_at = now()
        WHERE id = ${userId}
      `
    },

    async linkGoogleAccount(userId, googleSub) {
      await sql`
        UPDATE users SET google_sub = ${googleSub}, email_verified = TRUE, updated_at = now()
        WHERE id = ${userId}
      `
    },

    async markEmailVerified(userId) {
      await sql`
        UPDATE users SET email_verified = TRUE, updated_at = now()
        WHERE id = ${userId}
      `
    },

    async createSession(tokenHash, userId, expiresAt) {
      await sql`
        INSERT INTO sessions (token_hash, user_id, expires_at)
        VALUES (${tokenHash}, ${userId}, ${new Date(expiresAt).toISOString()})
        ON CONFLICT (token_hash) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          expires_at = EXCLUDED.expires_at,
          last_seen_at = now()
      `
    },

    async loadSession(tokenHash, now): Promise<Session | null> {
      const rows = await sql<{ user_id: string; expires_at: Date | string }[]>`
        SELECT user_id, expires_at
        FROM sessions
        WHERE token_hash = ${tokenHash}
      `

      const row = rows[0]
      if (!row) return null

      const expiresAt = row.expires_at instanceof Date ? row.expires_at.getTime() : Number(row.expires_at)
      if (expiresAt <= now) return null

      await sql`
        UPDATE sessions SET last_seen_at = now()
        WHERE token_hash = ${tokenHash}
      `

      return { userId: row.user_id, expiresAt }
    },

    async deleteSession(tokenHash) {
      await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`
    },

    async deleteUserSessions(userId) {
      await sql`DELETE FROM sessions WHERE user_id = ${userId}`
    },

    async createMagicLink(tokenHash, emailNorm, expiresAt) {
      await sql`
        INSERT INTO magic_links (token_hash, email_norm, expires_at)
        VALUES (${tokenHash}, ${emailNorm.toLowerCase()}, ${new Date(expiresAt).toISOString()})
        ON CONFLICT (token_hash) DO NOTHING
      `
    },

    async consumeMagicLink(tokenHash, now): Promise<MagicLink | null> {
      const rows = await sql<{ email_norm: string; expires_at: Date | string; consumed_at: Date | string | null }[]>`
        UPDATE magic_links
        SET consumed_at = now()
        WHERE token_hash = ${tokenHash}
          AND consumed_at IS NULL
          AND expires_at > ${new Date(now).toISOString()}
        RETURNING email_norm, expires_at, consumed_at
      `

      const row = rows[0]
      if (!row) return null

      const expiresAt = row.expires_at instanceof Date ? row.expires_at.getTime() : Number(row.expires_at)

      return { emailNorm: row.email_norm, expiresAt, consumedAt: now }
    },
  }
}
