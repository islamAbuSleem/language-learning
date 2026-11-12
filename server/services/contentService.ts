import { trackIdSchema, type TrackId, type Unit } from "#shared/content/schema"

import { parseUnit } from "../domain/content/parse"

const CONTENT_STORAGE = "assets:content"

/** The highest unit number any track may hold. */
const MAX_UNIT_NUMBER = 20

async function readJson(key: string): Promise<unknown | null> {
  const raw = await useStorage(CONTENT_STORAGE).getItem(key)

  if (raw === null || raw === undefined) return null
  if (typeof raw === "string") return JSON.parse(raw) as unknown

  return raw
}

export async function loadUnit(track: TrackId, unit: number): Promise<Unit | null> {
  const raw = await readJson(`${track}/unit-${unit}.json`)
  if (raw === null) return null

  return parseUnit(raw)
}

/**
 * The units of a track, in order.
 *
 * Discovered by probing the known unit numbers rather than by listing storage
 * keys: the asset storage does not expose a reliable prefix listing.
 */
export async function loadTrackUnits(track: TrackId): Promise<Unit[]> {
  const units: Unit[] = []

  for (let unit = 1; unit <= MAX_UNIT_NUMBER; unit += 1) {
    const content = await loadUnit(track, unit)
    if (content) units.push(content)
  }

  return units.sort((a, b) => a.unit - b.unit)
}

/** The tracks that actually have content. */
export async function loadAvailableTracks(): Promise<TrackId[]> {
  const tracks: TrackId[] = []

  for (const track of trackIdSchema.options) {
    const units = await loadTrackUnits(track)
    if (units.length > 0) tracks.push(track)
  }

  return tracks
}
