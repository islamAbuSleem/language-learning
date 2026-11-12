import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

/**
 * Passwords, hashed with scrypt and stored in PHC string format.
 *
 * No new dependency: node's own scrypt is the whole algorithm. The parameters
 * are the interactive-login recommendation, not the file-encryption one — a
 * third of a second per login is the price of the memory hardness.
 */
const OPTIONS = { N: 16384, r: 8, p: 1 } as const
const KEY_LENGTH = 64
const SALT_LENGTH = 16

/** `$scrypt$N=16384,r=8,p=1$<salt>$<hash>`, both parts unpadded base64. */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const hash = scryptSync(password, salt, KEY_LENGTH, OPTIONS)

  return `$scrypt$N=${OPTIONS.N},r=${OPTIONS.r},p=${OPTIONS.p}$${salt.toString("base64url")}$${hash.toString("base64url")}`
}

/**
 * Whether the password matches a stored hash.
 *
 * Malformed hashes never throw: a corrupt row denies the login instead of
 * crashing it. The comparison itself is constant-time.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$")

  if (parts.length !== 5 || parts[1] !== "scrypt") return false

  const params = Object.fromEntries(
    (parts[2] ?? "").split(",").map((pair) => pair.split("=")),
  )
  const N = Number(params["N"])
  const r = Number(params["r"])
  const p = Number(params["p"])

  if (![N, r, p].every(Number.isInteger) || N <= 1 || r < 1 || p < 1) return false

  let salt: Buffer
  let expected: Buffer

  try {
    salt = Buffer.from(parts[3] ?? "", "base64url")
    expected = Buffer.from(parts[4] ?? "", "base64url")
  } catch {
    return false
  }

  if (salt.length === 0 || expected.length === 0) return false

  const actual = scryptSync(password, salt, expected.length, { N, r, p })

  // Length first, because timingSafeEqual throws on a mismatch — and both
  // branches take the same shape so the failure tells nothing.
  if (actual.length !== expected.length) return false

  return timingSafeEqual(actual, expected)
}
