import { logout } from "../../services/authService"

export default defineEventHandler(async (event) => {
  await logout(event)

  return { ok: true }
})
