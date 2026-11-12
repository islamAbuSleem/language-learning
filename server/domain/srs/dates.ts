/**
 * Day helpers. Everything works on `YYYY-MM-DD` strings in UTC so the logic is
 * deterministic and testable. A learner-local day boundary is a later concern.
 */

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const MS_PER_DAY = 86_400_000

export function toIsoDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10)
}

export function isIsoDate(value: string): boolean {
  return ISO_DATE_PATTERN.test(value)
}

function toEpochMs(isoDate: string): number {
  if (!isIsoDate(isoDate)) {
    throw new Error(`Expected an ISO date (YYYY-MM-DD), received "${isoDate}"`)
  }
  return Date.parse(`${isoDate}T00:00:00.000Z`)
}

export function previousIsoDate(isoDate: string): string {
  return new Date(toEpochMs(isoDate) - MS_PER_DAY).toISOString().slice(0, 10)
}

export function isYesterday(candidate: string, reference: string): boolean {
  return previousIsoDate(reference) === candidate
}

export { MS_PER_DAY }
