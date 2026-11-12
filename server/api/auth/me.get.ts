import { availableMethods, currentUser } from "../../services/authService"

export default defineEventHandler(async (event) => {
  return {
    user: await currentUser(event),
    methods: availableMethods(),
  }
})
