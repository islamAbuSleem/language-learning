import {
  cefrLevelSchema,
  trackIdSchema,
  trackSchema,
  unitSchema,
  type CefrLevel,
  type Exercise,
  type Track,
  type TrackId,
  type Unit,
} from "#shared/content/schema"

const CONTENT_STORAGE = "assets:content"

/**
 * The highest unit number any level may hold.
 *
 * The levels are numbered from one, and A1 is the biggest at fifty units, so
 * the probe has to go past that. The misses are remembered, so the cost is
 * paid once.
 */
const MAX_UNIT_NUMBER = 120

/**
 * Units that are known not to exist.
 *
 * The unit numbers run on across the levels, so a level can start at seven
 * and the probe cannot stop at the first gap. The misses are remembered
 * instead, so the probing is paid for once.
 */
const missingUnits = new Set<string>()

/** Parsed units, kept so a session does not re-read and re-parse the file. */
const unitCache = new Map<string, Unit>()

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
  const cacheKey = `${track}/${level}/${unit}`
  const cached = unitCache.get(cacheKey)
  if (cached) return cached

  const raw = await readJson(`${track}/${level}/unit-${unit}.json`)
  if (raw === null) return null

  const result = unitSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Invalid unit content: ${result.error.message}`)
  }

  unitCache.set(cacheKey, result.data)

  return result.data
}

/**
 * Find one exercise by its id.
 *
 * Exercise ids carry their place in the path: `es/a1/u1/select/cafe`. The
 * practice session needs to go from an item the learner has met back to the
 * exercise itself.
 */
export async function findExercise(exerciseId: string): Promise<Exercise | null> {
  const parts = exerciseId.split("/")
  if (parts.length < 4) return null

  const track = trackIdSchema.safeParse(parts[0])
  const level = cefrLevelSchema.safeParse(parts[1]?.toUpperCase() ?? "")
  const unit = Number((parts[2] ?? "").replace(/^u/, ""))

  if (!track.success || !level.success || !Number.isInteger(unit) || unit < 1) return null

  const content = await loadUnit(track.data, level.data, unit)
  if (!content) return null

  return content.exercises.find((exercise) => exercise.id === exerciseId) ?? null
}

/**
 * The units of one level, in order.
 *
 * The units are found by probing the numbers, because the asset storage does
 * not give a reliable listing.
 */
export async function loadLevelUnits(track: TrackId, level: CefrLevel): Promise<Unit[]> {
  const units: Unit[] = []

  for (let unit = 1; unit <= MAX_UNIT_NUMBER; unit += 1) {
    const key = `${track}/${level}/${unit}`
    if (missingUnits.has(key)) continue

    const content = await loadUnit(track, level, unit)

    if (!content) {
      missingUnits.add(key)
      continue
    }

    units.push(content)
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
