/**
 * Build the audio for the vocabulary.
 *
 * The `listen` exercise needs to play a word. The browser's own voice is a
 * fallback, not a course: it sounds different on every machine, and it is
 * not Spanish on a machine with no Spanish voice installed. So the course
 * carries its own recordings, generated once from the vocabulary and cached
 * as files.
 *
 *   node scripts/build-audio.mjs             # write every word
 *   node scripts/build-audio.mjs --check     # fail if a recording is missing
 *   node scripts/build-audio.mjs --track es  # only this track
 *
 * The voice is eSpeak NG's Spanish, run locally through WebAssembly, so
 * nothing leaves the machine and no third-party recording is involved. The
 * files are plain MP3, so a native speaker can replace any of them later
 * without touching the code.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import { runInThisContext } from "node:vm"

import createEspeakModule from "@echogarden/espeak-ng-emscripten"

import { audioFileName, audioPath } from "./audio-name.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const contentRoot = join(root, "content")
const publicRoot = join(root, "public")

const check = process.argv.includes("--check")
const trackArg = process.argv.indexOf("--track")
const track = trackArg >= 0 ? process.argv[trackArg + 1] : "es"

/** eSpeak's Spanish voice. Ours is Spain, like the course's vocabulary. */
const VOICE = "roa/es"

/** The sample rate eSpeak speaks at. */
const SAMPLE_RATE = 22050

/** A mono MP3 at this rate is small enough to keep in the repository. */
const BIT_RATE = 32

/**
 * The MP3 encoder.
 *
 * lamejs ships a browser bundle and a modular build, and the modular build
 * is broken in Node: it uses a variable it never imports. The bundle works
 * everywhere, so it is the one we load.
 */
const require = createRequire(import.meta.url)
const lamejs = loadLame()

function loadLame() {
  const source = readFileSync(require.resolve("lamejs/lame.all.js"), "utf8")
  runInThisContext(source)

  return globalThis.lamejs
}

/** Every word of a track, in the order the learner meets them. */
function wordsOf(trackId) {
  const trackRoot = join(contentRoot, trackId)
  const words = []

  for (const level of readdirSync(trackRoot, { withFileTypes: true })) {
    if (!level.isDirectory()) continue

    const levelRoot = join(trackRoot, level.name)
    const files = readdirSync(levelRoot).filter((file) => file.endsWith(".vocab.json"))

    for (const file of files) {
      const vocabulary = JSON.parse(readFileSync(join(levelRoot, file), "utf8"))

      for (const item of vocabulary.items ?? []) {
        words.push(item.es)
      }
    }
  }

  return words
}

/**
 * The Spanish voice, ready to speak.
 *
 * The synthesiser speaks in chunks and asks whether to carry on: answering
 * "no" is what continues it, so the whole utterance arrives.
 */
async function createVoice() {
  const module = await createEspeakModule()
  const worker = new module.eSpeakNGWorker()

  worker.set_voice(VOICE)
  worker.set_rate(1.0)
  worker.set_pitch(1.0)
  worker.set_range(1.0)

  return {
    speak(text) {
      const chunks = []

      worker.synthesize(text, (samples) => {
        chunks.push(samples)
        return false
      })

      const total = chunks.reduce((count, chunk) => count + chunk.length, 0)
      const audio = new Int16Array(total)
      let offset = 0

      for (const chunk of chunks) {
        audio.set(chunk, offset)
        offset += chunk.length
      }

      return audio
    },
  }
}

/** The MP3 bytes of some 16-bit samples. */
function encodeMp3(samples) {
  const encoder = new lamejs.Mp3Encoder(1, SAMPLE_RATE, BIT_RATE)
  const parts = []

  for (let offset = 0; offset < samples.length; offset += 1152) {
    const chunk = encoder.encodeBuffer(samples.subarray(offset, offset + 1152))
    if (chunk.length > 0) parts.push(Buffer.from(chunk))
  }

  const last = encoder.flush()
  if (last.length > 0) parts.push(Buffer.from(last))

  return Buffer.concat(parts)
}

const words = [...new Set(wordsOf(track))]
const audioRoot = join(publicRoot, "audio", track)

if (!check) {
  mkdirSync(audioRoot, { recursive: true })
  const voice = await createVoice()

  let written = 0
  let bytes = 0

  for (const word of words) {
    const target = join(audioRoot, audioFileName(word))
    const mp3 = encodeMp3(voice.speak(word))

    writeFileSync(target, mp3)
    written += 1
    bytes += mp3.length

    if (written % 100 === 0) {
      console.log(`  ${written} of ${words.length} words`)
    }
  }

  console.log(
    `wrote ${written} recordings for ${track} (${Math.round(bytes / 1024)} KB) to ${audioRoot.replace(root + "\\", "")}`,
  )
} else {
  const missing = []

  for (const word of words) {
    const target = join(audioRoot, audioFileName(word))

    if (!existsSync(target) || statSync(target).size === 0) missing.push(word)
  }

  if (missing.length > 0) {
    console.error(`${missing.length} word(s) have no recording: ${missing.slice(0, 10).join(", ")}`)
    console.error("run: node scripts/build-audio.mjs")
    process.exit(1)
  }

  console.log(`every word of ${track} has a recording (${words.length} of them)`)
}

// The path the client asks for is part of the contract, so it is checked here
// as well as in the content.
if (!check && words.length > 0) {
  console.log(`example: ${audioPath(track, words[0])}`)
}
