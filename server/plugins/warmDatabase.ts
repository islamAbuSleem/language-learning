import { ensureSchema } from "../db/client"

/**
 * Open the database connection while the server starts, not on the first
 * request.
 *
 * The TLS handshake to Neon takes about two seconds. Paying it at boot means
 * the learner's first answer does not wait for it.
 */
export default defineNitroPlugin(() => {
  if (!process.env.DATABASE_URL) {
    console.warn("[language-app] DATABASE_URL is not set, progress will not be saved")
    return
  }

  void ensureSchema().catch((error: unknown) => {
    console.error("[language-app] the database is not ready:", String(error).slice(0, 200))
  })
})
