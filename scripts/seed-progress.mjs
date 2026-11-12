import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import postgres from "postgres"

const root = process.cwd()
const contentRoot = join(root, "content")
const learnerId = process.argv[2]

if (!learnerId) {
  console.error("usage: node scripts/seed-progress.mjs <learner-id>")
  process.exit(1)
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (/^unit-\d+\.json$/.test(entry.name)) out.push(path)
  }
  return out
}

const items = []
for (const file of walk(contentRoot)) {
  const unit = JSON.parse(readFileSync(file, "utf8"))
  for (const exercise of unit.exercises) items.push(exercise.id)
}

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1, onnotice: () => {} })

await sql`INSERT INTO learners (id) VALUES (${learnerId}) ON CONFLICT (id) DO NOTHING`

for (const itemId of items) {
  await sql`
    INSERT INTO item_states (learner_id, item_id, mastery, reps, lapses, stability, due_at, last_reviewed_at)
    VALUES (${learnerId}, ${itemId}, 0.9, 1, 0, 30, ${Date.now() + 86400000}, ${Date.now()})
    ON CONFLICT (learner_id, item_id) DO NOTHING
  `
}

const rows = await sql`SELECT count(*)::int AS n FROM item_states WHERE learner_id = ${learnerId}`
console.log(`seeded ${rows[0].n} items for ${learnerId}`)
await sql.end({ timeout: 5 })
