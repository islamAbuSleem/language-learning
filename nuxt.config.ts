export default defineNuxtConfig({
  compatibilityDate: "2026-01-01",
  devtools: { enabled: false },
  css: ["~/assets/css/main.css"],
  typescript: {
    strict: true,
    typeCheck: false,
  },
  nitro: {
    // Exercise content ships with the server, not the client bundle.
    serverAssets: [{ baseName: "content", dir: "./content" }],
  },
})
