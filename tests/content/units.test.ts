import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { unitSchema } from "#shared/content/schema"

const CONTENT_ROOT = join(process.cwd(), "content")

function contentFiles(): string[] {
  return readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const trackDir = join(CONTENT_ROOT, entry.name)
      return readdirSync(trackDir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => join(trackDir, file))
    })
}

describe("authored content", () => {
  const files = contentFiles()

  it("has content to check", () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it("validates every unit against the schema", () => {
    for (const file of files) {
      const raw: unknown = JSON.parse(readFileSync(file, "utf8"))
      const result = unitSchema.safeParse(raw)

      expect(result.success, `${file} failed validation`).toBe(true)
    }
  })

  it("gives every exercise a unique id across all tracks", () => {
    const ids = new Set<string>()

    for (const file of files) {
      const raw: unknown = JSON.parse(readFileSync(file, "utf8"))
      const unit = unitSchema.parse(raw)

      for (const exercise of unit.exercises) {
        expect(ids.has(exercise.id), `duplicate id ${exercise.id}`).toBe(false)
        ids.add(exercise.id)
      }
    }
  })

  it("builds units of ten exercises, matching the reference unit size", () => {
    for (const file of files) {
      const raw: unknown = JSON.parse(readFileSync(file, "utf8"))
      const unit = unitSchema.parse(raw)

      expect(unit.exercises.length, `${file} should hold ten exercises`).toBe(10)
    }
  })
})
