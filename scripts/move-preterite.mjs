/**
 * Move the preterite into A2, before the imperfect.
 *
 * The path audit found the hole: A2 teaches the imperfect and leans on the
 * preterite to explain it, and the preterite perfect does the same, but the
 * preterite itself was only taught in B1. A learner would meet the forms ten
 * units before the system behind them.
 *
 * The order below is the whole path after the move.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const spanish = join(root, "content", "es")

/** Every unit of A2 and B1, by the title it has. */
const wanted = [
  { level: "A2", title: "Things you do" },
  { level: "A2", title: "Writing and asking" },
  { level: "A2", title: "Going somewhere" },
  { level: "A2", title: "The day" },
  { level: "A2", title: "Having and needing" },
  { level: "A2", title: "Asking" },
  { level: "A2", title: "Knowing" },
  { level: "A2", title: "Review" },
  { level: "A2", title: "Liking things" },
  { level: "A2", title: "Por and para" },
  { level: "A2", title: "Where exactly" },
  { level: "A2", title: "What will happen" },
  { level: "A2", title: "Yesterday" },
  { level: "A2", title: "Yesterday, again" },
  { level: "A2", title: "What you used to do" },
  { level: "A2", title: "Giving orders" },
  { level: "A2", title: "Already happened" },
  { level: "B1", title: "Changing verbs" },
  { level: "B1", title: "Describing people" },
  { level: "B1", title: "Right now" },
  { level: "B1", title: "Him, her, them" },
  { level: "B1", title: "This, that, someone" },
  { level: "B1", title: "Myself" },
  { level: "B1", title: "Just now" },
  { level: "B1", title: "Bigger, better, different" },
  { level: "B1", title: "Giving things to people" },
  { level: "B1", title: "If it happens" },
  { level: "B1", title: "What you hope, and what you doubt" },
  { level: "B1", title: "What they said" },
  { level: "B1", title: "The person, not the thing" },
  { level: "B1", title: "Before that" },
]

const found = new Map()

for (const level of ["A2", "B1"]) {
  const dir = join(spanish, level)
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".vocab.json"))) {
    const vocabulary = JSON.parse(readFileSync(join(dir, file), "utf8"))
    found.set(vocabulary.title, vocabulary)
  }
}

const counters = { A2: 0, B1: 0 }

for (const entry of wanted) {
  // The unit is looked up by title in either level, and written to the level
  // the new order puts it in.
  const vocabulary = found.get(entry.title)
  if (!vocabulary) {
    console.error(`missing: ${entry.title}`)
    process.exit(1)
  }

  counters[entry.level] += 1
  vocabulary.unit = counters[entry.level]

  const path = join(spanish, entry.level, `unit-${vocabulary.unit}.vocab.json`)
  writeFileSync(path, `${JSON.stringify(vocabulary, null, 2)}\n`, "utf8")
}

console.log(`A2 now has ${counters.A2} units and B1 has ${counters.B1}`)
console.log("the preterite moved into A2, before the imperfect")
