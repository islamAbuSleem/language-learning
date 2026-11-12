import { logoutEverywhere } from "../../services/authService"

export default defineEventHandler(async (event) => {
  await logoutEverywhere(event)

  return { ok: true }
})
