import { loadAvailableTracks, loadTrackLadder } from "../services/contentService"

export default defineEventHandler(async () => {
  const trackIds = await loadAvailableTracks()

  const tracks = await Promise.all(
    trackIds.map(async (id) => {
      const ladder = await loadTrackLadder(id)
      if (!ladder) return null

      const manifest = ladder[0]

      return {
        id,
        name: manifest ? titleOf(id) : id,
        levels: ladder.map((level) => ({
          level: level.level,
          title: level.title,
          description: level.description,
          grammar: level.grammar,
          units: level.units.map((unit) => ({
            unit: unit.unit,
            title: unit.title,
            description: unit.description,
            exerciseCount: unit.exercises.length,
          })),
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
