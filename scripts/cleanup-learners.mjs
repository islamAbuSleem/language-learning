/**
 * Remove the test learners.
 *
 * The journey and dashboard checks create a learner each time they run, and
 * they are all left behind. This clears them out so the database holds only
 * real progress.
 *
 *   node --env-file=.env scripts/cleanup-learners.mjs --yes
 */
import postgres from "postgres"

const yes = process.argv.includes("--yes")
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1, onnotice: () => {} })

/**
 * The ids the checks use.
 *
 * The journey and the browser checks use a fixed prefix; a real learner gets a
 * uuid from the cookie, so it is never caught by these.
 */
const TEST_PREFIXES = ["test-", "b1-test-", "gram-", "gaps-", "gap-", "final-", "dash-", "a1-"]

try {
  const rows = await sql`select id from learners order by id`

  const testLearners = rows.filter((row) => TEST_PREFIXES.some((prefix) => row.id.startsWith(prefix)))
  const other = rows.filter((row) => !TEST_PREFIXES.some((prefix) => row.id.startsWith(prefix)))

  console.log(`${rows.length} learners, ${testLearners.length} of them from the checks`)
  if (other.length > 0) {
    console.log(`keeping ${other.length}: ${other.map((row) => row.id).join(", ")}`)
  }

  if (testLearners.length === 0) {
    console.log("nothing to clean")
  } else if (!yes) {
    console.log("\nrun it again with --yes to delete them")
  } else {
    for (const learner of testLearners) {
      await sql`DELETE FROM item_states WHERE learner_id = ${learner.id}`
      await sql`DELETE FROM learners WHERE id = ${learner.id}`
    }

    const left = await sql`select count(*)::int as n from learners`
    const items = await sql`select count(*)::int as n from item_states`
    console.log(`\ndeleted ${testLearners.length}. left: ${left[0].n} learners, ${items[0].n} item states`)
  }
} catch (error) {
  console.error("FAILED:", String(error).slice(0, 300))
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 })
}
