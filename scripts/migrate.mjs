/**
 * Apply the schema.
 *
 * Reads the same schema.json the app applies on boot, so there is one source
 * of truth. Every statement is idempotent.
 *
 *   node --env-file=.env scripts/migrate.mjs
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import postgres from "postgres"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const statements = JSON.parse(readFileSync(join(root, "server", "db", "schema.json"), "utf8"))

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL is not set. Use: node --env-file=.env scripts/migrate.mjs")
  process.exit(1)
}

const sql = postgres(url, { ssl: "require", max: 1, onnotice: () => {} })

try {
  for (const statement of statements) {
    await sql.unsafe(statement)
    console.log("applied:", statement.split("\n")[0].slice(0, 60))
  }

  const tables = await sql`
    select table_name from information_schema.tables where table_schema = 'public' order by table_name
  `
  console.log("tables:", tables.map((row) => row.table_name).join(", "))
} catch (error) {
  console.error("FAILED:", String(error).slice(0, 400))
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 })
}
