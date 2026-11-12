import { execFileSync } from "node:child_process"
import { describe, expect, it } from "vitest"

/**
 * The content quality check, run as a test.
 *
 * It catches the two defects that are invisible in a review but ruin a
 * lesson: a character that does not belong in Spanish, and a word taught
 * twice inside one level.
 */
describe("the content check", () => {
  it("finds nothing wrong with the content", () => {
    let output = ""
    let failed = false

    try {
      output = execFileSync("node", ["scripts/check-content.mjs"], {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "pipe",
      })
    } catch (error) {
      failed = true
      output = String((error as { stdout?: string }).stdout ?? "")
    }

    expect(output, output).toContain("the content is clean")
    expect(failed).toBe(false)
  })
})
