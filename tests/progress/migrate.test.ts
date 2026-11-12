import { describe, expect, it } from "vitest"

import {
  mapStaleIdToCurrent,
  normalizeSlug,
  parseStaleId,
  type CurrentExercise,
} from "../../server/domain/progress/migrateIds"

function single(id: string): CurrentExercise {
  const shape = id.split("/")[3] as string

  return { id, shape, slug: id.split("/").pop() as string, pairTexts: [] }
}

describe("stale exercise ids", () => {
  it("parses the parts that locate the unit", () => {
    expect(parseStaleId("es/a1/u1/select/azúcar")).toEqual({
      track: "es",
      level: "A1",
      unit: 1,
      shape: "select",
      slug: "azúcar",
    })
    expect(parseStaleId("not-an-id")).toBeNull()
    expect(parseStaleId("es/a1/u1/quiz/cafe")).toBeNull()
  })

  it("meets accents halfway", () => {
    expect(normalizeSlug("azúcar")).toBe("azucar")
    expect(normalizeSlug("¿Cómo estás?")).toBe("comoestas")
  })

  it("keeps the same shape when the word only changed spelling", () => {
    const current = [single("es/a1/u1/select/azucar"), single("es/a1/u1/listen/agua")]

    expect(
      mapStaleIdToCurrent(parseStaleId("es/a1/u1/select/azúcar")!, current, [{ es: "azúcar" }]),
    ).toBe("es/a1/u1/select/azucar")
  })

  it("follows the word when the shape moved", () => {
    const current = [single("es/a0/u1/listen/adios"), single("es/a0/u1/select/hola")]

    // The learner answered a select; these days the word is asked by listening.
    expect(
      mapStaleIdToCurrent(parseStaleId("es/a0/u1/select/adios")!, current, [{ es: "adiós" }]),
    ).toBe("es/a0/u1/listen/adios")
  })

  it("finds a match exercise by what it shows, not what it is called", () => {
    const current: CurrentExercise[] = [
      { id: "es/a1/u1/match/hola", shape: "match", slug: "hola", pairTexts: ["hello", "hola", "coffee", "el café"] },
    ]

    expect(
      mapStaleIdToCurrent(parseStaleId("es/a1/u1/select/cafe")!, current, [{ es: "café" }]),
    ).toBe("es/a1/u1/match/hola")
  })

  it("never guesses at drills", () => {
    const current = [single("es/a1/u1/drill/3")]

    expect(mapStaleIdToCurrent(parseStaleId("es/a1/u1/drill/9")!, current, [])).toBeNull()
  })

  it("returns null when nothing matches", () => {
    const current = [single("es/a1/u1/select/hola")]

    expect(mapStaleIdToCurrent(parseStaleId("es/a1/u1/select/zzz")!, current, [])).toBeNull()
  })
})
