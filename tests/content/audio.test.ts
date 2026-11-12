import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { unitSchema } from "#shared/content/schema"
import { audioFileName } from "../../scripts/audio-name.mjs"

const ROOT = process.cwd()
const CONTENT_ROOT = join(ROOT, "content")
const PUBLIC_ROOT = join(ROOT, "public")

function unitFiles(track: string): string[] {
  const trackDir = join(CONTENT_ROOT, track)

  return readdirSync(trackDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((level) =>
      readdirSync(join(trackDir, level.name))
        .filter((file) => /^unit-\d+\.json$/.test(file))
        .map((file) => join(trackDir, level.name, file)),
    )
}

/**
 * The audio of the course.
 *
 * The `listen` exercise plays a recording we made from our own vocabulary.
 * A word without a recording would fall back to the browser's voice, which
 * is not the same sound on every machine, so the recording has to be there.
 */
describe("the course audio", () => {
  const tracks = readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  const listenExercises = tracks.flatMap((track) =>
    unitFiles(track).flatMap((file) => {
      const unit = unitSchema.parse(JSON.parse(readFileSync(file, "utf8")))

      return unit.exercises
        .filter((exercise) => exercise.type === "listen")
        .map((exercise) => ({ file, exercise }))
    }),
  )

  /** Every choice a learner can hear: the options of select and listen. */
  const choiceExercises = tracks.flatMap((track) =>
    unitFiles(track).flatMap((file) => {
      const unit = unitSchema.parse(JSON.parse(readFileSync(file, "utf8")))

      return unit.exercises
        .filter((exercise) => exercise.type === "select" || exercise.type === "listen")
        .map((exercise) => ({ file, exercise }))
    }),
  )

  /** Every word of every track, with the file its recording lives in. */
  const words = tracks.flatMap((track) => {
    const trackDir = join(CONTENT_ROOT, track)

    return readdirSync(trackDir, { withFileTypes: true })
      .filter((level) => level.isDirectory())
      .flatMap((level) =>
        readdirSync(join(trackDir, level.name))
          .filter((file) => file.endsWith(".vocab.json"))
          .flatMap((file) => {
            const vocabulary = JSON.parse(
              readFileSync(join(trackDir, level.name, file), "utf8"),
            ) as { items: { es: string }[] }

            return vocabulary.items.map((item) => ({
              track,
              word: item.es,
              file: audioFileName(item.es),
            }))
          }),
      )
  })

  it("has listen exercises to speak", () => {
    expect(listenExercises.length).toBeGreaterThan(0)
  })

  it("points every listen exercise at a recording", () => {
    for (const { file, exercise } of listenExercises) {
      expect(
        exercise.type === "listen" ? exercise.audio.file : undefined,
        `${exercise.id} has no recording`,
      ).toBeTruthy()
      expect(file).toContain("content")
    }
  })

  it("gives every word of the course a recording", () => {
    for (const { track, word, file } of words) {
      const path = join(PUBLIC_ROOT, "audio", track, file)

      expect(existsSync(path), `"${word}" has no recording`).toBe(true)
      expect(statSync(path).size, `the recording of "${word}" is empty`).toBeGreaterThan(0)
    }
  })

  it("has the recording on disk for every listen exercise", () => {
    for (const { exercise } of listenExercises) {
      if (exercise.type !== "listen") continue

      const path = join(PUBLIC_ROOT, exercise.audio.file ?? "")

      expect(existsSync(path), `${exercise.audio.file} is missing`).toBe(true)
      expect(statSync(path).size, `${exercise.audio.file} is empty`).toBeGreaterThan(0)
    }
  })

  it("gives every choice a recording behind it", () => {
    expect(choiceExercises.length).toBeGreaterThan(0)

    for (const { exercise } of choiceExercises) {
      if (exercise.type !== "select" && exercise.type !== "listen") continue

      for (const option of exercise.options) {
        const file = exercise.audioFiles[option]

        expect(file, `${exercise.id} has no recording for "${option}"`).toBeTruthy()

        const path = join(PUBLIC_ROOT, file ?? "")

        expect(existsSync(path), `${file} is missing`).toBe(true)
        expect(statSync(path).size, `${file} is empty`).toBeGreaterThan(0)
      }
    }
  })

  it("keeps the fallback for a browser with no recording", () => {
    for (const { exercise } of listenExercises) {
      if (exercise.type !== "listen") continue

      expect(exercise.audio.text.length).toBeGreaterThan(0)
      expect(exercise.audio.lang).toBe("es")
    }
  })
})
