import { loadAvailableTracks, loadTrackLadder } from "../services/contentService"
import { getLearnerId } from "../services/learnerService"
import { getPathLocks } from "../services/pathService"

export default defineEventHandler(async (event) => {
  const trackIds = await loadAvailableTracks()
  const learnerId = getLearnerId(event)

  const tracks = await Promise.all(
    trackIds.map(async (id) => {
      const ladder = await loadTrackLadder(id)
      if (!ladder) return null

      const locks = await getPathLocks(id, learnerId)
      const lockFor = (level: string, unit: number) =>
        locks.find((lock) => lock.key === `${level}/${unit}`)

      return {
        id,
        name: ladder[0] ? titleOf(id) : id,
        levels: ladder.map((level) => ({
          level: level.level,
          title: level.title,
          description: level.description,
          grammar: level.grammar,
          units: level.units.map((unit) => {
            const lock = lockFor(level.level, unit.unit)

            return {
              unit: unit.unit,
              title: unit.title,
              description: unit.description,
              exerciseCount: unit.exercises.length,
              completed: lock?.completed ?? false,
              locked: lock?.locked ?? false,
            }
          }),
        })),
      }
    }),
  )

  return { tracks: tracks.filter((track) => track !== null) }
})

function titleOf(trackId: string): string {
  const names: Record<string, string> = {
    es: "Spanish",
    de: "German",
    en: "English",
  }

  return names[trackId] ?? trackId
}
