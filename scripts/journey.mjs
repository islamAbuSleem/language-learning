/**
 * The learner journey.
 *
 * Starts the app, then walks a brand new learner through the whole loop:
 *
 *   1. the first unit of the path is open and the second is locked
 *   2. the server refuses to start a locked unit
 *   3. the learner plays the first unit, every exercise
 *   4. the second unit opens the moment the first is finished
 *   5. the practice node hands back the items the learner has met
 *   6. the profile and the item states are what we expect
 *
 *   node --env-file=.env scripts/journey.mjs
 */
import { spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const PORT = 3123
const BASE = `http://127.0.0.1:${PORT}`

const problems = []
const notes = []

function check(label, condition, detail = "") {
  if (condition) {
    notes.push(`  ok   ${label}`)
  } else {
    problems.push(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`)
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/api/health`)
      if (response.ok) return true
    } catch {}
    await sleep(500)
  }
  return false
}

const server = spawn("node", [".output/server/index.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT) },
  stdio: "ignore",
})

let cookie = ""

async function call(path, options = {}) {
  const headers = { "content-type": "application/json", ...(options.headers ?? {}) }
  if (cookie) headers.cookie = cookie

  const response = await fetch(BASE + path, { ...options, headers })
  const setCookie = response.headers.getSetCookie?.() ?? []
  for (const raw of setCookie) {
    const pair = raw.split(";")[0]
    if (pair.startsWith("learner=")) cookie = pair
  }

  let body = null
  try {
    body = await response.json()
  } catch {}

  return { status: response.status, body }
}

/** The answer the content says is right, in the shape the API expects. */
function correctResponse(exercise) {
  switch (exercise.type) {
    case "select":
    case "listen":
      return { kind: "choice", value: exercise.answer }
    case "type_in":
      return { kind: "text", value: exercise.answer }
    case "match":
      return {
        kind: "match",
        pairs: exercise.pairs.map((pair) => ({ left: pair.left, right: pair.right })),
      }
  }
}

try {
  if (!(await waitForServer())) {
    console.error("the server did not start")
    process.exit(1)
  }

  // 1. the path
  const tracks = await call("/api/tracks")
  const spanish = tracks.body.tracks.find((track) => track.id === "es")
  const levels = spanish.levels.map((level) => `${level.level}:${level.units.length}`).join(" ")
  check("the ladder loads", spanish.levels.length === 5, levels)

  const firstUnit = spanish.levels[0].units[0]
  const secondUnit = spanish.levels[0].units[1]
  check("the first unit of the path is open", firstUnit.locked === false)
  check("the second unit is locked", secondUnit.locked === true)

  // 2. the server refuses a locked unit
  const locked = await call("/api/session", {
    method: "POST",
    body: JSON.stringify({ track: "es", level: secondUnit.level ?? spanish.levels[0].level, unit: secondUnit.unit }),
  })
  check("a locked unit is refused", locked.status === 409, `status ${locked.status}`)

  // 3. play the first unit
  const started = await call("/api/session", {
    method: "POST",
    body: JSON.stringify({ track: "es", level: spanish.levels[0].level, unit: firstUnit.unit }),
  })
  check("the first unit starts", started.status === 200, `status ${started.status}`)

  const content = JSON.parse(
    readFileSync(join(root, "content", "es", "A0", `unit-${firstUnit.unit}.json`), "utf8"),
  )

  let played = 0
  for (const exercise of content.exercises) {
    const answer = await call("/api/answer", {
      method: "POST",
      body: JSON.stringify({ sessionId: started.body.sessionId, response: correctResponse(exercise) }),
    })
    if (answer.body.outcome !== "correct") {
      problems.push(`  FAIL ${exercise.id} was graded ${answer.body.outcome}`)
      break
    }

    const complete = await call("/api/complete", {
      method: "POST",
      body: JSON.stringify({ sessionId: started.body.sessionId, grade: "too_easy" }),
    })
    if (complete.status !== 200) {
      problems.push(`  FAIL completing ${exercise.id} returned ${complete.status}`)
      break
    }
    played += 1
  }
  check("every exercise was played", played === content.exercises.length, `${played} of ${content.exercises.length}`)

  // 4. the next unit opens
  const after = await call("/api/tracks")
  const spanishAfter = after.body.tracks.find((track) => track.id === "es")
  const firstAfter = spanishAfter.levels[0].units[0]
  const secondAfter = spanishAfter.levels[0].units[1]
  check("the finished unit is marked done", firstAfter.completed === true)
  check("the next unit is now open", secondAfter.locked === false)

  // 5. the practice node hands back what the learner has met
  const practice = await call("/api/practice", {
    method: "POST",
    body: JSON.stringify({ mode: "weak", count: 10 }),
  })
  check("practice returns the items the learner has met", practice.body.total === played, `total ${practice.body.total}`)

  // 6. the profile
  const progress = await call("/api/progress")
  check("the learner has xp", progress.body.profile.xp === played * 2, `xp ${progress.body.profile.xp}`)
  check("the learner has a streak", progress.body.profile.streak === 1)
  check("every item was remembered", progress.body.items.length === played, `items ${progress.body.items.length}`)

  console.log(notes.join("\n"))
  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):`)
    for (const problem of problems) console.error(problem)
    process.exitCode = 1
  } else {
    console.log("\nthe journey works: lock, play, unlock, practise")
  }
} finally {
  server.kill()
}
