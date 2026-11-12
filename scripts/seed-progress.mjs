import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import postgres from "postgres"

const root = process.cwd()
const contentRoot = join(root, "content")
const learnerId = process.argv[2]

/**
 * How many units to mark as done, and how many answers to get wrong.
 *
 *   node --env-file=.env scripts/seed-progress.mjs <id> [units] [mistakes]
 *
 * With no number, every unit is marked, which is what the path audit wants.
 * With a number, only the first units of the path are, which is what a
 * half-way learner looks like. The mistakes are the answers that went wrong
 * in the first unit, which is what a weak unit looks like.
 */
const unitLimit = process.argv[3] ? Number(process.argv[3]) : Number.POSITIVE_INFINITY
const mistakes = process.argv[4] ? Number(process.argv[4]) : 0

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
    // Directory order is alphabetical, which puts unit-10 before unit-2.
    // A half-way learner means the first units of the path, in path order.
    files.sort((a, b) => Number(a.match(/unit-(\d+)\.json$/)[1]) - Number(b.match(/unit-(\d+)\.json$/)[1]))
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

for (const [index, itemId] of items.entries()) {
  // The first few items are answered wrong, so the unit they belong to comes
  // out weak: that is what the revisit path is for.
  const lapses = index < mistakes ? 1 : 0
  const mastery = lapses > 0 ? 0.3 : 0.9

  await sql`
    INSERT INTO item_states (learner_id, item_id, mastery, reps, lapses, stability, due_at, last_reviewed_at)
    VALUES (${learnerId}, ${itemId}, ${mastery}, 1, ${lapses}, 30, ${Date.now() + 86400000}, ${Date.now()})
    ON CONFLICT (learner_id, item_id) DO NOTHING
  `
}

// The days the learner showed up: the seeded answers are spread over the last
// few days, most recent units last, so the calendar and the streaks have
// something true to say. Without this the progress page would show a learner
// with hundreds of words and no history.
const dayBuckets = Math.min(5, Math.max(1, Math.ceil(items.length / 10)))
const perDay = Math.ceil(items.length / dayBuckets)

for (let bucket = 0; bucket < dayBuckets; bucket += 1) {
  const slice = items.slice(bucket * perDay, (bucket + 1) * perDay)
  if (slice.length === 0) continue

  const day = new Date(Date.now() - (dayBuckets - 1 - bucket) * 86400000)
    .toISOString()
    .slice(0, 10)
  const correct = slice.filter((_, i) => bucket * perDay + i >= mistakes).length

  await sql`
    INSERT INTO practice_days (learner_id, day, answers, correct, xp)
    VALUES (${learnerId}, ${day}, ${slice.length}, ${correct}, ${slice.length * 2})
    ON CONFLICT (learner_id, day) DO NOTHING
  `
}

const rows = await sql`SELECT count(*)::int AS n FROM item_states WHERE learner_id = ${learnerId}`
console.log(`seeded ${rows[0].n} items across ${units} units for ${learnerId}`)
await sql.end({ timeout: 5 })
