import { describe, expect, it } from "vitest"

import type { Exercise } from "#shared/content/schema"
import {
  correctAnswerLabel,
  gradeExercise,
  normalizeAnswer,
  responseKindFor,
} from "../../server/domain/exercise/grading"

const selectExercise: Exercise = {
  id: "es/u1/select/cafe",
  type: "select",
  prompt: "Pick the Spanish word for “coffee”.",
  options: ["el agua", "el café"],
  answer: "el café",
  translation: "coffee",
}

const matchExercise: Exercise = {
  id: "es/u1/match/cafe-sur",
  type: "match",
  prompt: "Pair each word with its translation.",
  pairs: [
    { left: "the table", right: "la mesa" },
    { left: "hot", right: "caliente" },
  ],
}

const typeInExercise: Exercise = {
  id: "es/u1/type_in/cuenta",
  type: "type_in",
  prompt: "Write “the bill” in Spanish.",
  answer: "la cuenta",
  acceptedAnswers: ["cuenta"],
  translation: "the bill",
}

describe("normalizeAnswer", () => {
  it("folds case, accents and punctuation", () => {
    expect(normalizeAnswer("  Café.  ")).toBe("cafe")
    expect(normalizeAnswer("¿Café?")).toBe("cafe")
    expect(normalizeAnswer("la  cuenta")).toBe("la cuenta")
  })
})

describe("responseKindFor", () => {
  it("maps each exercise type to the answer shape it expects", () => {
    expect(responseKindFor("select")).toBe("choice")
    expect(responseKindFor("listen")).toBe("choice")
    expect(responseKindFor("match")).toBe("match")
    expect(responseKindFor("type_in")).toBe("text")
  })
})

describe("gradeExercise", () => {
  it("marks a select answer correct", () => {
    expect(gradeExercise(selectExercise, { kind: "choice", value: "el café" })).toBe("correct")
  })

  it("ignores accent and case differences in a select answer", () => {
    expect(gradeExercise(selectExercise, { kind: "choice", value: "EL CAFE" })).toBe("correct")
  })

  it("marks a wrong select answer incorrect", () => {
    expect(gradeExercise(selectExercise, { kind: "choice", value: "el agua" })).toBe("incorrect")
  })

  it("marks a skip as skipped", () => {
    expect(gradeExercise(selectExercise, { kind: "skip" })).toBe("skipped")
  })

  it("grades a match only when every pair is right", () => {
    const allRight = {
      kind: "match" as const,
      pairs: [
        { left: "the table", right: "la mesa" },
        { left: "hot", right: "caliente" },
      ],
    }
    const oneWrong = {
      kind: "match" as const,
      pairs: [
        { left: "the table", right: "la mesa" },
        { left: "hot", right: "la silla" },
      ],
    }

    expect(gradeExercise(matchExercise, allRight)).toBe("correct")
    expect(gradeExercise(matchExercise, oneWrong)).toBe("incorrect")
  })

  it("rejects a match that is missing a pair", () => {
    expect(
      gradeExercise(matchExercise, {
        kind: "match",
        pairs: [{ left: "the table", right: "la mesa" }],
      }),
    ).toBe("incorrect")
  })

  it("accepts a typed answer or one of its accepted spellings", () => {
    expect(gradeExercise(typeInExercise, { kind: "text", value: "la cuenta" })).toBe("correct")
    expect(gradeExercise(typeInExercise, { kind: "text", value: "cuenta" })).toBe("correct")
    expect(gradeExercise(typeInExercise, { kind: "text", value: "La Cuenta." })).toBe("correct")
  })

  it("rejects an empty typed answer", () => {
    expect(gradeExercise(typeInExercise, { kind: "text", value: "   " })).toBe("incorrect")
  })

  it("rejects a typed answer that is not in the list", () => {
    expect(gradeExercise(typeInExercise, { kind: "text", value: "la mesa" })).toBe("incorrect")
  })

  it("treats a response of the wrong shape as incorrect", () => {
    expect(gradeExercise(selectExercise, { kind: "text", value: "el café" })).toBe("incorrect")
  })
})

describe("correctAnswerLabel", () => {
  it("shows the answer for a single-answer exercise", () => {
    expect(correctAnswerLabel(selectExercise)).toBe("el café")
  })

  it("shows every pair for a match exercise", () => {
    expect(correctAnswerLabel(matchExercise)).toBe("the table → la mesa · hot → caliente")
  })
})
