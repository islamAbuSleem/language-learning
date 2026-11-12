import postgres from "postgres"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL is not set")
  process.exit(1)
}

const sql = postgres(url, { ssl: "require", max: 1, connect_timeout: 15 })

try {
  const rows = await sql`select version() as v, current_database() as db, current_user as usr`
  console.log("connected to :", rows[0].db)
  console.log("user         :", rows[0].usr)
  console.log("server       :", String(rows[0].v).split(" ").slice(0, 2).join(" "))
  const tables = await sql`select table_name from information_schema.tables where table_schema = 'public'`
  console.log("tables       :", tables.length ? tables.map((t) => t.table_name).join(", ") : "(none)")
} catch (error) {
  console.error("FAILED:", String(error).slice(0, 500))
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 })
}