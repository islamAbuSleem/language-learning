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
const TEST_PREFIXES = ["test-", "b1-test-", "gram-", "gaps-", "gap-", "final-", "dash-", "a1-", "prose-", "speak-", "desk-", "go-", "polish-", "audit-"]

/**
 * The emails the checks sign up with.
 *
 * A test account owns rows across four tables, so it is removed by user id,
 * not by learner id: the account's learner id is a uuid like anyone's.
 */
const TEST_EMAIL_PREFIXES = ["journey-", "ui-", "dbg-", "test-", "prov-", "prof-", "magic-"]

try {
  const rows = await sql`select id from learners order by id`

  const testLearners = rows.filter((row) => TEST_PREFIXES.some((prefix) => row.id.startsWith(prefix)))
  const other = rows.filter((row) => !TEST_PREFIXES.some((prefix) => row.id.startsWith(prefix)))

  console.log(`${rows.length} learners, ${testLearners.length} of them from the checks`)
  if (other.length > 0) {
    console.log(`keeping ${other.length} learners`)
  }

  const users = await sql`select id, email from users order by email`
  const testUsers = users.filter((row) =>
    TEST_EMAIL_PREFIXES.some((prefix) => row.email.startsWith(prefix)),
  )

  console.log(`${users.length} users, ${testUsers.length} of them from the checks`)
  if (testUsers.length > 0) {
    console.log(`deleting users: ${testUsers.map((row) => row.email).join(", ")}`)
  }

  if (testLearners.length === 0 && testUsers.length === 0) {
    console.log("nothing to clean")
  } else if (!yes) {
    console.log("\nrun it again with --yes to delete them")
  } else {
    for (const learner of testLearners) {
      await sql`DELETE FROM item_states WHERE learner_id = ${learner.id}`
      await sql`DELETE FROM practice_days WHERE learner_id = ${learner.id}`
      await sql`DELETE FROM learners WHERE id = ${learner.id}`
    }

    for (const user of testUsers) {
      await sql`DELETE FROM item_states WHERE learner_id = ${user.id}`
      await sql`DELETE FROM practice_days WHERE learner_id = ${user.id}`
      await sql`DELETE FROM learners WHERE id = ${user.id}`
      await sql`DELETE FROM magic_links WHERE email_norm = ${user.email.toLowerCase()}`
      await sql`DELETE FROM users WHERE id = ${user.id}`
    }

    const left = await sql`select count(*)::int as n from learners`
    const items = await sql`select count(*)::int as n from item_states`
    console.log(`\ndeleted ${testLearners.length} learners and ${testUsers.length} users. left: ${left[0].n} learners, ${items[0].n} item states`)
  }
} catch (error) {
  console.error("FAILED:", String(error).slice(0, 300))
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 })
}
