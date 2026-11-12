import {
  cefrLevelSchema,
  trackIdSchema,
  trackSchema,
  unitSchema,
  type CefrLevel,
  type Track,
  type TrackId,
  type Unit,
} from "#shared/content/schema"

const CONTENT_STORAGE = "assets:content"

/** The highest unit number any level may hold. */
const MAX_UNIT_NUMBER = 20

async function readJson(key: string): Promise<unknown | null> {
  const raw = await useStorage(CONTENT_STORAGE).getItem(key)

  if (raw === null || raw === undefined) return null
  if (typeof raw === "string") return JSON.parse(raw) as unknown

  return raw
}

/**
 * The track manifest: the whole level ladder, including levels that have no
 * units yet. The path is authored here, not derived from the units that
 * happen to exist.
 */
export async function loadTrackManifest(track: TrackId): Promise<Track | null> {
  const raw = await readJson(`${track}/track.json`)
  if (raw === null) return null

  const result = trackSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Invalid track manifest for "${track}": ${result.error.message}`)
  }

  return result.data
}

export async function loadUnit(
  track: TrackId,
  level: CefrLevel,
  unit: number,
): Promise<Unit | null> {
  const raw = await readJson(`${track}/${level}/unit-${unit}.json`)
  if (raw === null) return null

  const result = unitSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Invalid unit content: ${result.error.message}`)
  }

  return result.data
}

/** The units of one level, in order. */
export async function loadLevelUnits(track: TrackId, level: CefrLevel): Promise<Unit[]> {
  const units: Unit[] = []

  for (let unit = 1; unit <= MAX_UNIT_NUMBER; unit += 1) {
    const content = await loadUnit(track, level, unit)
    if (content) units.push(content)
  }

  return units.sort((a, b) => a.unit - b.unit)
}

export interface TrackLevel {
  level: CefrLevel
  title: string
  description: string
  grammar: string[]
  units: Unit[]
}

/** The full ladder for a track, with the units each level holds. */
export async function loadTrackLadder(track: TrackId): Promise<TrackLevel[] | null> {
  const manifest = await loadTrackManifest(track)
  if (!manifest) return null

  return Promise.all(
    manifest.levels.map(async (level) => ({
      level: level.level,
      title: level.title,
      description: level.description,
      grammar: level.grammar,
      units: await loadLevelUnits(track, level.level),
    })),
  )
}

export async function loadAvailableTracks(): Promise<TrackId[]> {
  const tracks: TrackId[] = []

  for (const track of trackIdSchema.options) {
    const manifest = await loadTrackManifest(track)
    if (manifest) tracks.push(track)
  }

  return tracks
}

export { cefrLevelSchema }
