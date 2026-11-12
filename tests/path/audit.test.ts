import { execFileSync } from "node:child_process"
import { describe, expect, it } from "vitest"

/**
 * The path audit, run as a test.
 *
 * It checks three things: the numbers are contiguous inside every level, no
 * unit uses a grammar point before it has been taught, and every unit has a
 * lesson, some examples, some drills and ten words.
 */
describe("the path audit", () => {
  it("finds no gaps in the path", () => {
    let output = ""
    let failed = false

    try {
      output = execFileSync("node", ["scripts/audit-path.mjs"], {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "pipe",
      })
    } catch (error) {
      failed = true
      output = String((error as { stdout?: string }).stdout ?? "")
    }

    expect(output, output).toContain("no gaps")
    expect(failed).toBe(false)
  })
})
