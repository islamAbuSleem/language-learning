import { unitSchema, type Unit } from "#shared/content/schema"

/**
 * Validate one unit of raw content.
 *
 * The parse is pure so it can run in a test, in the API and at build time.
 */
export function parseUnit(raw: unknown): Unit {
  const result = unitSchema.safeParse(raw)

  if (!result.success) {
    throw new Error(`Invalid unit content: ${result.error.message}`)
  }

  return result.data
}
