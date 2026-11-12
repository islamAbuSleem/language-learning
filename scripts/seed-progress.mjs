import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import postgres from "postgres"

const root = process.cwd()
const contentRoot = join(root, "content")
const learnerId = process.argv[2]

/**
 * How many units to mark as done.
 *
 *   node --env-file=.env scripts/seed-progress.mjs <id> [units]
 *
 * With no number, every unit is marked, which is what the path audit wants.
 * With a number, only the first units of the path are, which is what a
 * half-way learner looks like.
 */
const unitLimit = process.argv[3] ? Number(process.argv[3]) : Number.POSITIVE_INFINITY

if (!learnerId) {
  console.error("usage: node --env-file=.env scripts/seed-progress.mjs <learner-id> [units]")
  process.exit(1)
}

const LEVEL_ORDER = ["A0", "A1", "A2", "B1", "B2"]

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (/^unit-\d+\.json$/.test(entry.name)) out.push(path)
  }
  return out
}

/** The units of the path, in the order a learner meets them. */
const unitFiles = []
for (const track of readdirSync(contentRoot, { withFileTypes: true }).filter((e) => e.isDirectory())) {
  for (const level of LEVEL_ORDER) {
    const dir = join(contentRoot, track.name, level)
    let files
    try {
      files = walk(dir)
    } catch {
      continue
    }
    for (const file of files) unitFiles.push(file)
  }
}

const items = []
let units = 0

for (const file of unitFiles) {
  if (units >= unitLimit) break
  const unit = JSON.parse(readFileSync(file, "utf8"))
  for (const exercise of unit.exercises) items.push(exercise.id)
  units += 1
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
console.log(`seeded ${rows[0].n} items across ${units} units for ${learnerId}`)
await sql.end({ timeout: 5 })
