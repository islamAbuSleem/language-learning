import { describe, expect, it } from "vitest"

import { SPANISH_FUNCTION_WORDS, splitProse } from "#shared/content/highlight"

function spanishOf(text: string, words: string[] = []): string[] {
  return splitProse(text, words)
    .filter((segment) => segment.spanish)
    .map((segment) => segment.text)
}

describe("spanish inside english prose", () => {
  it("marks the unit's own words, phrases before single words", () => {
    const segments = splitProse("La pasta de dientes is on the table.", ["pasta de dientes"])

    expect(segments).toEqual([
      { text: "La", spanish: true },
      { text: " ", spanish: false },
      { text: "pasta de dientes", spanish: true },
      { text: " is on the table.", spanish: false },
    ])
  })

  it("marks accented tokens without needing the word list", () => {
    expect(spanishOf("El café becomes los cafés.")).toEqual(["El", "café", "los", "cafés"])
  })

  it("marks the function words", () => {
    expect(spanishOf("Usually el is masculine and la is feminine.")).toEqual(["el", "la"])
  })

  it("leaves english alone", () => {
    expect(splitProse("You have to learn the gender with the word.", [])).toEqual([
      { text: "You have to learn the gender with the word.", spanish: false },
    ])
  })

  it("does not mark the english uses the audit found", () => {
    // "no" is English in "there is no article".
    expect(spanishOf("There is no article with a month.")).toEqual([])
    // "a" is the English article.
    expect(spanishOf("I want a coffee.")).toEqual([])
    // "me" is English in "close to me".
    expect(spanishOf("Este means this, close to me.", [])).toEqual(["Este"])
    // "-o" is a letter being talked about, not the word "o".
    expect(spanishOf("Most nouns ending in -o are masculine.")).toEqual([])
    // "e.g." is not the word "e".
    expect(spanishOf("For example, e.g. the plural.", [])).toEqual([])
  })

  it("keeps the original text byte for byte", () => {
    const text = "¿Qué hay? asks what there is: hay dos personas."
    const joined = splitProse(text, ["persona"])
      .map((segment) => segment.text)
      .join("")

    expect(joined).toBe(text)
  })

  it("matches case-insensitively but keeps the original case", () => {
    expect(spanishOf("El is masculine.", [])).toEqual(["El"])
  })

  it("needs the word list for an unaccented content word", () => {
    expect(spanishOf("Leche is feminine.")).toEqual([])
    expect(spanishOf("Leche is feminine.", ["leche"])).toEqual(["Leche"])
    expect(spanishOf("After querer you use un or una.")).toEqual(["un", "una"])
  })

  it("keeps the stoplist honest: every entry earns its place", () => {
    // The audit covered the whole course; a word with an English use
    // ("no", "a", "me", "o", "u", "e") must never be added back.
    for (const word of ["no", "a", "me", "o", "u", "e"]) {
      expect(SPANISH_FUNCTION_WORDS, `"${word}" has an English use`).not.toContain(word)
    }

    expect(SPANISH_FUNCTION_WORDS.length).toBeGreaterThan(50)
  })
})
