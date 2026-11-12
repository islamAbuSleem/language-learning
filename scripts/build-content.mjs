/**
 * Build the exercise files from the vocabulary.
 *
 * The vocabulary is the authored content. The exercises are derived from it:
 * a unit of ten words becomes ten exercises, in four shapes, with distractors
 * drawn only from words the learner has already met.
 *
 *   node scripts/build-content.mjs          # write every unit
 *   node scripts/build-content.mjs --check  # fail if the files are out of date
 *
 * The generated files are committed, so the app never needs this script. The
 * test in tests/content/generated.test.ts runs the same logic and fails if the
 * committed files no longer match the vocabulary.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const contentRoot = join(root, "content")
const check = process.argv.includes("--check")

/** Words a unit may use as wrong answers: this unit and the ones before it. */
function introducedWords(track, level, unit, vocabularies) {
  const words = []

  for (const [otherLevel, units] of Object.entries(vocabularies[track] ?? {})) {
    for (const [otherUnit, vocabulary] of Object.entries(units)) {
      const isEarlierLevel = levelOrder(otherLevel) < levelOrder(level)
      const isEarlierUnit = otherLevel === level && Number(otherUnit) <= unit

      if (isEarlierLevel || isEarlierUnit) {
        for (const item of vocabulary.items) words.push(item)
      }
    }
  }

  return words
}

const LEVEL_ORDER = ["A0", "A1", "A2", "B1", "B2"]

function levelOrder(level) {
  const index = LEVEL_ORDER.indexOf(level)
  return index < 0 ? LEVEL_ORDER.length : index
}

/** A safe id fragment: lowercase, no accents, no punctuation. */
function slug(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** A stable hash, so the generated content never changes between runs. */
function hash(text) {
  let value = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    value = (value ^ text.charCodeAt(i)) * 16777619
  }
  return value >>> 0
}

function rotate(list, amount) {
  if (list.length === 0) return []
  const start = amount % list.length
  return [...list.slice(start), ...list.slice(0, start)]
}

function display(item) {
  return item.article ? `${item.article} ${item.es}` : item.es
}

/** A deterministic shuffle, so the answer is not always in the same place. */
function shuffle(list, seed) {
  const result = [...list]

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = hash(`${seed}:${i}`) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

/**
 * The options of a choice exercise: the right answer and three wrong ones.
 *
 * The wrong ones come from the words already introduced, same theme first.
 * A wrong answer the learner has never seen is a new word wearing a disguise.
 */
function options(item, pool, count, seed) {
  const candidates = pool.filter((other) => other.es !== item.es && other.en !== item.en)

  const sameTag = candidates.filter((other) =>
    (item.tags ?? []).some((tag) => (other.tags ?? []).includes(tag)),
  )
  const rest = candidates.filter((other) => !sameTag.includes(other))

  const wrong = [...rotate(sameTag, seed), ...rotate(rest, seed)]
    .slice(0, count - 1)
    .map(display)

  return shuffle([display(item), ...wrong], seed)
}

/**
 * The shapes of a unit, so the same shape never comes twice in a row.
 *
 * A unit holds ten exercises. Drills take the place of word exercises: when
 * a unit has grammar drills, the word slots they replace become drills.
 */
function planShapes(wordCount, drillCount) {
  const matchCount = Math.max(1, Math.floor(wordCount / 5))
  const rest = Math.max(0, wordCount - matchCount - drillCount)

  const typeInCount = drillCount === 0 ? Math.floor(rest / 4) : 0
  const listenCount = Math.floor(rest / 4)
  const selectCount = rest - typeInCount - listenCount

  const buckets = [
    Array(matchCount).fill("match"),
    Array(selectCount).fill("select"),
    Array(typeInCount).fill("type_in"),
    Array(listenCount).fill("listen"),
    Array(drillCount).fill("drill"),
  ].filter((bucket) => bucket.length > 0)

  const plan = []
  let index = 0
  while (buckets.some((bucket) => bucket.length > 0)) {
    const bucket = buckets[index % buckets.length]
    if (bucket.length > 0) {
      plan.push(bucket.shift())
    }
    index += 1
  }

  return plan
}

/** The same word without its accents, so a learner is not marked down for one. */
function withoutAccents(text) {
  return text.replace(/[áéíóúñü]/g, (c) => ({
    á: "a", é: "e", í: "i", ó: "o", ú: "u", ñ: "n", ü: "u",
  })[c])
}

function buildUnit(vocabulary, track, level, pool) {
  const items = vocabulary.items
  const drills = vocabulary.drills ?? []
  const shapes = planShapes(items.length, drills.length)

  let matchIndex = 0
  let singleIndex = 0
  let drillIndex = 0
  const exercises = []

  for (const [index, shape] of shapes.entries()) {
    const seed = hash(`${vocabulary.unit}:${index}`)

    if (shape === "match") {
      const block = items.slice((matchIndex * 5) % items.length, ((matchIndex * 5) % items.length) + 5)
      matchIndex += 1

      if (block.length < 2) continue

      exercises.push({
        id: `${track}/${level.toLowerCase()}/u${vocabulary.unit}/match/${slug(block[0].es)}`,
        type: "match",
        prompt: "Pair each word with its translation.",
        pairs: block.map((item) => ({ left: item.en, right: display(item) })),
        note: vocabulary.grammarNote ?? undefined,
      })
      continue
    }

    if (shape === "drill") {
      const drill = drills[drillIndex]
      drillIndex += 1
      if (!drill) continue

      exercises.push({
        id: `${track}/${level.toLowerCase()}/u${vocabulary.unit}/drill/${drillIndex}`,
        type: "type_in",
        prompt: drill.prompt,
        answer: drill.answer,
        acceptedAnswers: [withoutAccents(drill.answer)],
        translation: drill.meaning,
        note: drill.note ?? undefined,
      })
      continue
    }

    const item = items[singleIndex % items.length]
    singleIndex += 1

    if (shape === "select") {
      exercises.push({
        id: `${track}/${level.toLowerCase()}/u${vocabulary.unit}/select/${slug(item.es)}`,
        type: "select",
        prompt: `Pick the Spanish word for “${item.en}”.`,
        options: options(item, pool, 4, seed),
        answer: display(item),
        translation: item.en,
        note: item.note ?? vocabulary.grammarNote ?? undefined,
      })
      continue
    }

    if (shape === "type_in") {
      exercises.push({
        id: `${track}/${level.toLowerCase()}/u${vocabulary.unit}/type_in/${slug(item.es)}`,
        type: "type_in",
        prompt: `Write “${item.en}” in Spanish.`,
        answer: item.es,
        acceptedAnswers: [withoutAccents(item.es)],
        translation: item.en,
        note: item.note ?? vocabulary.grammarNote ?? undefined,
      })
      continue
    }

    exercises.push({
      id: `${track}/${level.toLowerCase()}/u${vocabulary.unit}/listen/${slug(item.es)}`,
      type: "listen",
      prompt: "What did you hear?",
      answer: display(item),
      options: options(item, pool, 4, seed),
      audio: { text: item.es, lang: "es" },
      translation: item.en,
      note: item.note ?? vocabulary.grammarNote ?? undefined,
    })
  }

  return {
    track,
    level,
    unit: vocabulary.unit,
    title: vocabulary.title,
    description: vocabulary.description,
    explanation: vocabulary.explanation,
    exercises,
  }
}

function walk(root, out = []) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (entry.name.endsWith(".vocab.json")) out.push(path)
  }
  return out
}

const vocabularies = {}
const files = walk(contentRoot)

for (const file of files) {
  const vocabulary = JSON.parse(readFileSync(file, "utf8"))
  const relative = file.slice(contentRoot.length + 1).split(/[\\/]/)
  const track = relative[0]
  const level = relative[1]
  vocabularies[track] ??= {}
  vocabularies[track][level] ??= {}
  vocabularies[track][level][vocabulary.unit] = vocabulary
}

let stale = 0

for (const file of files) {
  const vocabulary = JSON.parse(readFileSync(file, "utf8"))
  const relative = file.slice(contentRoot.length + 1).split(/[\\/]/)
  const track = relative[0]
  const level = relative[1]
  const target = join(contentRoot, track, level, `unit-${vocabulary.unit}.json`)

  const pool = introducedWords(track, level, vocabulary.unit, vocabularies)
  const unit = buildUnit(vocabulary, track, level, pool)

  const contents = `${JSON.stringify(unit, null, 2)}\n`

  if (check) {
    const existing = existsSync(target) ? readFileSync(target, "utf8") : ""
    if (existing !== contents) {
      console.error(`out of date: ${target.replace(root + "\\", "")}`)
      stale += 1
    }
  } else {
    writeFileSync(target, contents, "utf8")
    console.log(`wrote ${target.replace(root + "\\", "")} (${unit.exercises.length} exercises)`)
  }
}

if (check) {
  if (stale > 0) {
    console.error(`${stale} file(s) differ from the vocabulary. Run: node scripts/build-content.mjs`)
    process.exit(1)
  }
  console.log("every exercise file matches its vocabulary")
}
