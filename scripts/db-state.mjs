import postgres from "postgres"

/**
 * A look at what the database holds.
 *
 *   node --env-file=.env scripts/db-state.mjs
 */
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1, onnotice: () => {} })

try {
  const columns = await sql`
    select table_name, column_name, data_type
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, ordinal_position
  `

  let table = ""
  for (const column of columns) {
    if (column.table_name !== table) {
      table = column.table_name
      console.log(`\n${table}`)
    }
    console.log(`  ${column.column_name}: ${column.data_type}`)
  }

  const learners = await sql`select count(*)::int as n from learners`
  const items = await sql`select count(*)::int as n from item_states`

  console.log(`\nlearners: ${learners[0].n}`)
  console.log(`item states: ${items[0].n}`)

  const top = await sql`
    select learner_id, count(*)::int as items, round(avg(mastery)::numeric, 2) as avg_mastery
    from item_states
    group by learner_id
    order by items desc
    limit 5
  `
  for (const row of top) {
    console.log(`  ${row.learner_id}: ${row.items} items, average mastery ${row.avg_mastery}`)
  }
} catch (error) {
  console.error("FAILED:", String(error).slice(0, 300))
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 })
}
