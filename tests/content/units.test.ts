import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { trackSchema, unitSchema } from "#shared/content/schema"

const CONTENT_ROOT = join(process.cwd(), "content")

function trackDirs(): string[] {
  return readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
}

function unitFiles(track: string): { level: string; file: string }[] {
  const trackDir = join(CONTENT_ROOT, track)
  if (!readdirSync(trackDir).some((name) => name.endsWith(".json"))) return []

  return readdirSync(trackDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) =>
      readdirSync(join(trackDir, entry.name))
        .filter((file) => file.endsWith(".json"))
        .map((file) => ({ level: entry.name, file: join(trackDir, entry.name, file) })),
    )
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown
}

describe("track manifests", () => {
  const tracks = trackDirs()

  it("has at least one track", () => {
    expect(tracks.length).toBeGreaterThan(0)
  })

  it("gives every track the full A1 to B2 ladder", () => {
    for (const track of tracks) {
      const manifest = trackSchema.parse(readJson(join(CONTENT_ROOT, track, "track.json")))

      expect(manifest.levels.map((level) => level.level)).toEqual(["A1", "A2", "B1", "B2"])
    }
  })

  it("gives every level a grammar focus", () => {
    for (const track of tracks) {
      const manifest = trackSchema.parse(readJson(join(CONTENT_ROOT, track, "track.json")))

      for (const level of manifest.levels) {
        expect(level.grammar.length, `${track} ${level.level} has no grammar`).toBeGreaterThan(0)
        expect(level.description.length).toBeGreaterThan(0)
      }
    }
  })
})

describe("authored units", () => {
  const files = trackDirs().flatMap((track) => unitFiles(track))

  it("has content to check", () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it("validates every unit against the schema", () => {
    for (const { file } of files) {
      const result = unitSchema.safeParse(readJson(file))

      expect(result.success, `${file} failed validation`).toBe(true)
    }
  })

  it("keeps a unit in the level directory it claims", () => {
    for (const { level, file } of files) {
      const unit = unitSchema.parse(readJson(file))

      expect(unit.level, `${file} sits in ${level} but claims ${unit.level}`).toBe(level)
    }
  })

  it("gives every exercise a unique id across all tracks and levels", () => {
    const ids = new Set<string>()

    for (const { file } of files) {
      const unit = unitSchema.parse(readJson(file))

      for (const exercise of unit.exercises) {
        expect(ids.has(exercise.id), `duplicate id ${exercise.id}`).toBe(false)
        ids.add(exercise.id)
      }
    }
  })

  it("builds units of ten exercises, matching the reference unit size", () => {
    for (const { file } of files) {
      const unit = unitSchema.parse(readJson(file))

      expect(unit.exercises.length, `${file} should hold ten exercises`).toBe(10)
    }
  })
})
