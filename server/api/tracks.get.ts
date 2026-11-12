import { loadAvailableTracks, loadTrackUnits } from "../services/contentService"

export default defineEventHandler(async () => {
  const trackIds = await loadAvailableTracks()

  const tracks = await Promise.all(
    trackIds.map(async (id) => {
      const units = await loadTrackUnits(id)

      return {
        id,
        units: units.map((unit) => ({
          unit: unit.unit,
          title: unit.title,
          description: unit.description,
          exerciseCount: unit.exercises.length,
        })),
      }
    }),
  )

  return { tracks }
})
