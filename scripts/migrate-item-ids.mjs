/**
 * Move orphaned item states onto current exercises.
 *
 * Exercise ids carry the word in a slug, and an early version of the
 * generator slugified differently — the raw word went in, accents and all —
 * while the shape plan has moved words between shapes since. Both orphan
 * rows: answered, but pointing at an id no unit holds, so the unit can never
 * complete and the next one never opens.
 *
 *   node scripts/migrate-item-ids.mjs          # report only
 *   node scripts/migrate-item-ids.mjs --yes    # move the rows
 *
 * The mapping is the conservative one in server/domain/progress/migrateIds:
 * same unit, same normalized word, shape preferred but not required, drills
 * never guessed at. Orphans with nowhere to go are listed, not moved. Run
 * this after any content change that renames exercises, before committing.
 */
import { readFileSync, readdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { pathToFileURL } from "node:url"

import { buildSync } from "esbuild"
import postgres from "postgres"

const root = process.cwd()
const contentRoot = join(root, "content", "es")
const apply = process.argv.includes("--yes")

// The mapping lives in TypeScript next to the domain it belongs to. It is
// bundled on the fly so this script and the unit tests always read the same
// code — a second copy would drift within a month.
const bundled = join(tmpdir(), `migrate-ids-${Date.now()}.mjs`)
buildSync({
  entryPoints: [join(root, "server", "domain", "progress", "migrateIds.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundled,
  logLevel: "silent",
})

const { mapStaleIdToCurrent, parseStaleId } = await import(pathToFileURL(bundled).href)
rmSync(bundled, { force: true })

/** Current exercises and vocabulary, keyed by `LEVEL/unit`. */
const units = new Map()
for (const level of readdirSync(contentRoot, { withFileTypes: true }).filter((e) => e.isDirectory())) {
  for (const file of readdirSync(join(contentRoot, level.name)).filter((f) => /^unit-\d+\.json$/.test(f))) {
    const unit = JSON.parse(readFileSync(join(contentRoot, level.name, file), "utf8"))
    units.set(`${level.name}/${unit.unit}`, {
      exercises: unit.exercises.map((e) => ({
        id: e.id,
        shape: e.type,
        slug: e.id.split("/").pop() ?? "",
        pairTexts: e.type === "match" ? e.pairs.flatMap((p) => [p.left, p.right]) : [],
      })),
    })
  }
  for (const file of readdirSync(join(contentRoot, level.name)).filter((f) => f.endsWith(".vocab.json"))) {
    const unit = JSON.parse(readFileSync(join(contentRoot, level.name, file), "utf8"))
    const entry = units.get(`${level.name}/${unit.unit}`) ?? { exercises: [] }
    entry.vocabulary = (unit.items ?? []).map((i) => ({ es: i.es }))
    units.set(`${level.name}/${unit.unit}`, entry)
  }
}

const currentIds = new Set()
for (const { exercises } of units.values()) {
  for (const exercise of exercises) currentIds.add(exercise.id)
}

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1, onnotice: () => {} })

try {
  const rows = await sql`
    SELECT learner_id, item_id, mastery, reps, lapses, stability, due_at, last_reviewed_at
    FROM item_states
    WHERE item_id LIKE 'es/%'
  `

  const moves = []
  const leftovers = []

  for (const row of rows) {
    if (currentIds.has(row.item_id)) continue

    const parsed = parseStaleId(row.item_id)
    const entry = parsed ? units.get(`${parsed.level}/${parsed.unit}`) : undefined
    const target =
      parsed && entry
        ? mapStaleIdToCurrent(parsed, entry.exercises, entry.vocabulary ?? [])
        : null

    if (target) moves.push({ ...row, target })
    else leftovers.push(row.item_id)
  }

  console.log(`${rows.length} Spanish rows, ${moves.length} move, ${leftovers.length} orphaned`)

  const byUnit = new Map()
  for (const move of moves) {
    const key = `${move.target}  <-  ${move.item_id}`
    byUnit.set(key, (byUnit.get(key) ?? 0) + 1)
  }
  for (const [mapping, count] of [...byUnit.entries()].sort()) {
    console.log(`  ${count}x ${mapping}`)
  }

  if (leftovers.length > 0) {
    console.log("orphaned with nowhere to go:")
    for (const id of [...new Set(leftovers)].sort()) console.log(`  ${id}`)
  }

  // Drills never move: their ids are positional, so a changed drill is a
  // changed lesson to redo, not a rename to follow.
  const drills = moves.filter((m) => m.target.includes("/drill/") || m.item_id.includes("/drill/"))
  if (drills.length > 0) {
    console.log(`\nREFUSING: ${drills.length} move(s) involve drills — inspect by hand`)
    process.exitCode = 1
  }

  if (!apply) {
    console.log("\nreport only. run again with --yes to move the rows")
  } else {
    await sql.begin(async (tx) => {
      for (const move of moves) {
        // The same word demonstrated twice lands on one row: most recent
        // wins, exactly like a signup merge.
        await tx`
          INSERT INTO item_states (learner_id, item_id, mastery, reps, lapses, stability, due_at, last_reviewed_at)
          VALUES (${move.learner_id}, ${move.target}, ${move.mastery}, ${move.reps}, ${move.lapses}, ${move.stability}, ${move.due_at}, ${move.last_reviewed_at})
          ON CONFLICT (learner_id, item_id) DO UPDATE SET
            mastery = CASE WHEN COALESCE(EXCLUDED.last_reviewed_at, -1) >= COALESCE(item_states.last_reviewed_at, -1) THEN EXCLUDED.mastery ELSE item_states.mastery END,
            reps = CASE WHEN COALESCE(EXCLUDED.last_reviewed_at, -1) >= COALESCE(item_states.last_reviewed_at, -1) THEN EXCLUDED.reps ELSE item_states.reps END,
            lapses = CASE WHEN COALESCE(EXCLUDED.last_reviewed_at, -1) >= COALESCE(item_states.last_reviewed_at, -1) THEN EXCLUDED.lapses ELSE item_states.lapses END,
            stability = CASE WHEN COALESCE(EXCLUDED.last_reviewed_at, -1) >= COALESCE(item_states.last_reviewed_at, -1) THEN EXCLUDED.stability ELSE item_states.stability END,
            due_at = CASE WHEN COALESCE(EXCLUDED.last_reviewed_at, -1) >= COALESCE(item_states.last_reviewed_at, -1) THEN EXCLUDED.due_at ELSE item_states.due_at END,
            last_reviewed_at = CASE WHEN COALESCE(EXCLUDED.last_reviewed_at, -1) >= COALESCE(item_states.last_reviewed_at, -1) THEN EXCLUDED.last_reviewed_at ELSE item_states.last_reviewed_at END
        `
        await tx`DELETE FROM item_states WHERE learner_id = ${move.learner_id} AND item_id = ${move.item_id}`
      }

      // Orphans point at exercises that no longer exist in any form. They
      // can never complete a unit, so keeping them only lies about progress.
      for (const id of new Set(leftovers)) {
        await tx`DELETE FROM item_states WHERE item_id = ${id}`
      }
    })

    const left = await sql`select count(*)::int as n from item_states where item_id like 'es/%'`
    console.log(`\nmoved ${moves.length} rows. Spanish rows left: ${left[0].n}`)
  }
} catch (error) {
  console.error("FAILED:", String(error).slice(0, 400))
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 })
}
