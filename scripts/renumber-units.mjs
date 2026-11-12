/**
 * Renumber the units of each level, so they run 1..N inside their level.
 *
 * The level is part of the unit's identity, so a level does not need to know
 * where the level before it ended. This keeps the content files readable:
 * A2 starts at unit-1, not unit-7.
 */
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const contentRoot = join(root, "content")

const tracks = readdirSync(contentRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

for (const track of tracks) {
  const trackDir = join(contentRoot, track)
  const levels = readdirSync(trackDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  for (const level of levels) {
    const levelDir = join(trackDir, level)
    const files = readdirSync(levelDir)
      .filter((file) => file.endsWith(".vocab.json"))
      .map((file) => {
        const path = join(levelDir, file)
        return { file, path, unit: JSON.parse(readFileSync(path, "utf8")).unit }
      })
      .sort((a, b) => a.unit - b.unit)

    files.forEach((entry, index) => {
      const next = index + 1
      if (entry.unit === next) return

      const vocabulary = JSON.parse(readFileSync(entry.path, "utf8"))
      vocabulary.unit = next
      writeFileSync(entry.path, `${JSON.stringify(vocabulary, null, 2)}\n`, "utf8")

      const target = join(levelDir, `unit-${next}.vocab.json`)
      if (target !== entry.path) renameSync(entry.path, target)
    })

    // the generated files are rebuilt from the vocabulary, so drop the stale ones
    for (const file of readdirSync(levelDir)) {
      if (/^unit-\d+\.json$/.test(file)) rmSync(join(levelDir, file))
    }

    console.log(`${track}/${level}: ${files.length} units`)
  }
}
