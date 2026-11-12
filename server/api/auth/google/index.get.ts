import { googleStart } from "../../../services/googleAuth"

export default defineEventHandler((event) => {
  return sendRedirect(event, googleStart(event))
})
