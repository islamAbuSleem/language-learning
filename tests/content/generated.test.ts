import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { unitSchema } from "#shared/content/schema"

const ROOT = process.cwd()
const CONTENT_ROOT = join(ROOT, "content")

function walk(root: string, out: string[] = []): string[] {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else out.push(path)
  }
  return out
}

const vocabFiles = walk(CONTENT_ROOT).filter((file) => file.endsWith(".vocab.json"))

describe("generated content", () => {
  it("has vocabulary to build from", () => {
    expect(vocabFiles.length).toBeGreaterThan(0)
  })

  it("keeps every exercise file in step with its vocabulary", () => {
    // The generator is the same code the build script runs, so a vocabulary
    // change that was not rebuilt fails here instead of shipping silently.
    const result = execFileSync("node", ["scripts/build-content.mjs", "--check"], {
      cwd: ROOT,
      encoding: "utf8",
    })

    expect(result).toContain("matches its vocabulary")
  })

  it("builds a unit of ten exercises from ten words", () => {
    for (const file of vocabFiles) {
      const vocabulary = JSON.parse(readFileSync(file, "utf8")) as {
        unit: number
        items: unknown[]
      }
      const relative = file.slice(CONTENT_ROOT.length + 1).split(/[\\/]/)
      const target = join(CONTENT_ROOT, relative[0]!, relative[1]!, `unit-${vocabulary.unit}.json`)

      expect(existsSync(target), `${target} was never built`).toBe(true)

      const unit = unitSchema.parse(JSON.parse(readFileSync(target, "utf8")))
      expect(unit.exercises.length).toBe(10)
    }
  })

  it("never uses a word the learner has not met as a wrong answer", () => {
    const levelOrder = ["A1", "A2", "B1", "B2"]

    for (const file of vocabFiles) {
      const vocabulary = JSON.parse(readFileSync(file, "utf8")) as {
        unit: number
        items: { es: string; en: string; article: string | null }[]
      }
      const relative = file.slice(CONTENT_ROOT.length + 1).split(/[\\/]/)
      const track = relative[0]!
      const level = relative[1]!
      const target = join(CONTENT_ROOT, track, level, `unit-${vocabulary.unit}.json`)
      const unit = unitSchema.parse(JSON.parse(readFileSync(target, "utf8")))

      // Everything the learner has met by the time they reach this unit.
      const introduced = new Set<string>()

      for (const otherFile of vocabFiles) {
        const other = JSON.parse(readFileSync(otherFile, "utf8")) as {
          unit: number
          items: { es: string; en: string; article: string | null }[]
        }
        const otherRelative = otherFile.slice(CONTENT_ROOT.length + 1).split(/[\\/]/)
        if (otherRelative[0] !== track) continue

        const otherLevel = otherRelative[1]!
        const earlierLevel = levelOrder.indexOf(otherLevel) < levelOrder.indexOf(level)
        const earlierUnit = otherLevel === level && other.unit < vocabulary.unit

        if (!earlierLevel && !earlierUnit) continue

        for (const item of other.items) {
          introduced.add(item.article ? `${item.article} ${item.es}` : item.es)
        }
      }

      for (const item of vocabulary.items) {
        introduced.add(item.article ? `${item.article} ${item.es}` : item.es)
      }

      for (const exercise of unit.exercises) {
        if (exercise.type !== "select" && exercise.type !== "listen") continue

        for (const option of exercise.options) {
          expect(
            introduced.has(option),
            `${exercise.id} offers "${option}", which the learner has not met yet`,
          ).toBe(true)
        }
      }
    }
  },
  // Slow by design: it re-reads every vocabulary file for every unit, so the
  // course outgrew the default 5s timeout at around a hundred units.
  30_000,
  )
})
