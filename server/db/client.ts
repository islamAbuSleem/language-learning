import postgres from "postgres"

import type { Sql } from "postgres"

import statements from "./schema.json"

/**
 * The database connection.
 *
 * `DATABASE_URL` holds the credentials. It never enters the repository:
 * `.env` is gitignored and `.env.example` holds a placeholder.
 */
let client: Sql | null = null

export function getSql(): Sql {
  if (client) return client

  const url = process.env.DATABASE_URL
  if (!url) {
    throw createError({
      statusCode: 500,
      statusMessage: "DATABASE_URL is not configured",
    })
  }

  client = postgres(url, {
    ssl: "require",
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
  })

  return client
}

/**
 * The schema.
 *
 * `schema.json` is the single source of truth: the app applies it on boot and
 * `scripts/migrate.mjs` applies the same file from the command line. Every
 * statement is idempotent, so there is no version table.
 */
let schemaPromise: Promise<void> | null = null

export function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const sql = getSql()
      for (const statement of statements) {
        await sql.unsafe(statement)
      }
    })().catch((error: unknown) => {
      schemaPromise = null
      throw error
    })
  }

  return schemaPromise
}
