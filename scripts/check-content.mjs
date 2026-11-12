import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

/**
 * Scan the content for characters that do not belong.
 *
 * Spanish uses accented Latin letters and the inverted marks. Anything else in
 * a Spanish string is a typo, and a typo in a lesson is a wrong lesson.
 */

const root = process.cwd()
const contentRoot = join(root, "content")

const ALLOWED = /[A-Za-zÀ-ÿ¡¿ñÑáéíóúüÁÉÍÓÚÜ0-9\s.,;:!?'"‘’“”()\-–—/…&+*=%$#@[\]{}<>|_\n\r\t→]/u

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (entry.name.endsWith(".json")) out.push(path)
  }
  return out
}

function stringsIn(value, path = "") {
  const out = []
  if (typeof value === "string") out.push({ path, value })
  else if (Array.isArray(value)) value.forEach((v, i) => out.push(...stringsIn(v, `${path}[${i}]`)))
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) out.push(...stringsIn(v, path ? `${path}.${k}` : k))
  }
  return out
}

const problems = []

for (const file of walk(contentRoot)) {
  const raw = JSON.parse(readFileSync(file, "utf8"))

  for (const { path, value } of stringsIn(raw)) {
    for (const char of value) {
      if (!ALLOWED.test(char)) {
        problems.push(`${file.replace(root + "\\", "")} ${path}: "${char}" (U+${char.codePointAt(0).toString(16).toUpperCase()})`)
      }
    }

    // Three underscores are the blank in a drill. Any other use of an
    // underscore is the mark of a half-finished sentence.
    const isIdentifier = path.endsWith(".id") || path.endsWith(".type")
    if (!isIdentifier) {
      const stray = value.replace(/___/g, "").includes("_")
      if (stray) {
        problems.push(`${file.replace(root + "\\", "")} ${path}: a stray underscore: "${value.slice(0, 80)}"`)
      }
    }
  }
}

/**
 * Words that are taught twice inside one level on purpose.
 *
 * The key is `level:word`. Each one says why it is allowed, so the list can
 * be argued with rather than quietly grown.
 */
const ALLOWED_REPEATS = new Map([
  ["es:B1:me", "the same pronoun, used as a direct object in B1/4 and an indirect object in B1/9"],
  ["es:B1:te", "the same pronoun, used as a direct object in B1/4 and an indirect object in B1/9"],
  ["es:B1:nos", "the same pronoun, used as a direct object in B1/4 and an indirect object in B1/9"],
])

/**
 * The words of every level, so a word taught twice can be found.
 *
 * A word repeated inside one level is a mistake: the learner is asked to
 * learn it, forgets it, and is asked again. A word repeated across levels is
 * a review, which is the whole point of the path.
 */
function wordsByLevel() {
  const levels = new Map()

  for (const file of walk(contentRoot)) {
    if (!file.endsWith(".vocab.json")) continue

    const vocabulary = JSON.parse(readFileSync(file, "utf8"))
    const relative = file.slice(contentRoot.length + 1).split(/[\\/]/)
    const track = relative[0]
    const level = relative[1]
    const key = `${track}:${level}`

    levels.set(key, levels.get(key) ?? [])
    levels.get(key).push({ unit: vocabulary.unit, items: vocabulary.items ?? [] })
  }

  return levels
}

for (const [key, units] of wordsByLevel()) {
  const seen = new Map()

  for (const { unit, items } of units) {
    for (const item of items) {
      const word = item.es.toLowerCase()
      const first = seen.get(word)

      if (first === undefined) {
        seen.set(word, unit)
        continue
      }

      const allowed = ALLOWED_REPEATS.get(`${key}:${word}`)
      if (allowed) continue

      problems.push(
        `${key}: "${item.es}" is taught in unit ${first} and again in unit ${unit} — a word should be taught once in a level`,
      )
    }
  }
}

if (problems.length > 0) {
  console.error(`${problems.length} problem(s) in the content:`)
  for (const problem of problems) console.error("  " + problem)
  process.exit(1)
}

console.log("the content is clean: no stray characters, no word taught twice in a level")
