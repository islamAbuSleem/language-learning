import { loadAvailableTracks, loadTrackLadder } from "../services/contentService"
import { getLearnerId } from "../services/learnerService"
import { getPathProgress } from "../services/pathService"

export default defineEventHandler(async (event) => {
  const trackIds = await loadAvailableTracks()
  const learnerId = getLearnerId(event)

  const tracks = await Promise.all(
    trackIds.map(async (id) => {
      const ladder = await loadTrackLadder(id)
      if (!ladder) return null

      const progress = await getPathProgress(id, learnerId)
      const forUnit = (level: string, unit: number) =>
        progress.find((entry) => entry.key === `${level}/${unit}`)

      return {
        id,
        name: ladder[0] ? titleOf(id) : id,
        levels: ladder.map((level) => ({
          level: level.level,
          title: level.title,
          description: level.description,
          grammar: level.grammar,
          units: level.units.map((unit) => {
            const state = forUnit(level.level, unit.unit)

            return {
              unit: unit.unit,
              title: unit.title,
              description: unit.description,
              exerciseCount: unit.exercises.length,
              completed: state?.completed ?? false,
              locked: state?.status === "locked",
              /** Where the unit sits: locked, current, done or weak. */
              status: state?.status ?? "locked",
              /** Right answers over answers, 0..1. Null before the first answer. */
              accuracy: state?.accuracy ?? null,
              answered: state?.answered ?? 0,
              /** Words of this unit that are still shaky. */
              shaky: state?.shaky ?? 0,
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
