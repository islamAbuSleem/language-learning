/**
 * Who may sign in, and how.
 *
 * A user is one human with an email address. Signing in happens three ways —
 * a password, a magic link, or Google — but there is only one account per
 * email, and linking a second way never creates a second account.
 */
export interface User {
  id: string
  email: string
  displayName: string
  /** True once a password, a magic link or Google has proven the address. */
  emailVerified: boolean
  hasPassword: boolean
  hasGoogle: boolean
  createdAt: string
}

/** The row behind a User, with the secrets the API never sees. */
export interface UserRow extends User {
  passwordHash: string | null
  googleSub: string | null
}

/** A login that has not expired yet. */
export interface Session {
  userId: string
  expiresAt: number
}

/** A single-use sign-in link, hashed like a session token. */
export interface MagicLink {
  emailNorm: string
  expiresAt: number
  consumedAt: number | null
}

/**
 * Where accounts live.
 *
 * Passwords and tokens never leave this seam as anything but hashes; the
 * service layer hands over plain secrets and gets back plain facts.
 */
export interface AuthRepository {
  createUser(input: {
    id: string
    email: string
    displayName: string
    passwordHash: string | null
    googleSub: string | null
    emailVerified: boolean
  }): Promise<User>
  setDisplayName(userId: string, displayName: string): Promise<void>
  findUserByEmailNorm(emailNorm: string): Promise<UserRow | null>
  findUserByGoogleSub(googleSub: string): Promise<UserRow | null>
  findUserById(userId: string): Promise<UserRow | null>
  setPasswordHash(userId: string, passwordHash: string): Promise<void>
  linkGoogleAccount(userId: string, googleSub: string): Promise<void>
  markEmailVerified(userId: string): Promise<void>
  createSession(tokenHash: string, userId: string, expiresAt: number): Promise<void>
  loadSession(tokenHash: string, now: number): Promise<Session | null>
  deleteSession(tokenHash: string): Promise<void>
  deleteUserSessions(userId: string): Promise<void>
  createMagicLink(tokenHash: string, emailNorm: string, expiresAt: number): Promise<void>
  consumeMagicLink(tokenHash: string, now: number): Promise<MagicLink | null>
}
