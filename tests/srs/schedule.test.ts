import { describe, expect, it } from "vitest"

import { dueAtFor, intervalDaysFor, nextStability } from "../../server/domain/srs/schedule"
import { MS_PER_DAY } from "../../server/domain/srs/dates"

describe("intervalDaysFor", () => {
  it("brings a brand new or badly known item back in the same session", () => {
    expect(intervalDaysFor(0)).toBe(0)
    expect(intervalDaysFor(0.19)).toBe(0)
  })

  it("steps the interval up with mastery", () => {
    expect(intervalDaysFor(0.2)).toBe(1)
    expect(intervalDaysFor(0.4)).toBe(2)
    expect(intervalDaysFor(0.6)).toBe(4)
    expect(intervalDaysFor(0.8)).toBe(8)
  })

  it("uses the two week floor for a well known item", () => {
    expect(intervalDaysFor(0.95)).toBe(14)
    expect(intervalDaysFor(1)).toBe(14)
  })
})

describe("nextStability", () => {
  it("resets to zero after a wrong answer so the item returns this session", () => {
    expect(nextStability(8, 0.3, "incorrect")).toBe(0)
  })

  it("follows the mastery schedule for a correct answer", () => {
    expect(nextStability(0, 0.3, "correct")).toBe(1)
    expect(nextStability(4, 0.7, "correct")).toBe(4)
  })

  it("stretches a well known item beyond the floor", () => {
    expect(nextStability(8, 1, "correct")).toBe(20)
    expect(nextStability(1, 1, "correct")).toBe(14)
  })
})

describe("dueAtFor", () => {
  it("turns a stability in days into an epoch deadline", () => {
    expect(dueAtFor(1_000, 2)).toBe(1_000 + 2 * MS_PER_DAY)
  })
})
