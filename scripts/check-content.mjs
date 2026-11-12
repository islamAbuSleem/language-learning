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

const ALLOWED = /[A-Za-zÀ-ÿ¡¿ñÑáéíóúüÁÉÍÓÚÜ0-9\s.,;:!?'"‘’“”()\-–—/…&+*=%$#@[\]{}<>|_\n\r\t]/u

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
  }
}

if (problems.length > 0) {
  console.error(`${problems.length} stray character(s) in the content:`)
  for (const problem of problems) console.error("  " + problem)
  process.exit(1)
}

console.log("the content has no stray characters")
