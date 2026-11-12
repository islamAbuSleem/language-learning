/**
 * Build the audio for the vocabulary.
 *
 * The `listen` exercise needs to play a word. The browser's own voice is a
 * fallback, not a course: it sounds different on every machine, and it is
 * not Spanish on a machine with no Spanish voice installed. So the course
 * carries its own recordings, generated once from the vocabulary and cached
 * as files.
 *
 *   node scripts/build-audio.mjs                  # every word, best engine available
 *   node scripts/build-audio.mjs --engine piper   # the neural voice
 *   node scripts/build-audio.mjs --engine espeak  # the bundled voice, no install
 *   node scripts/build-audio.mjs --check          # fail if a recording is missing
 *
 * Two engines, on purpose:
 *
 * - **piper** is a neural voice and it is what the course ships with. It
 *   needs Python and a voice model on the machine; the model is a download.
 * - **espeak** is bundled as WebAssembly, needs nothing installed, and is
 *   the fallback. It is intelligible but robotic.
 *
 * Neither engine involves a third-party *recording*: both synthesise the
 * word from text. A recording made by a human is a different thing, and it
 * drops straight in: see scripts/import-native-audio.mjs.
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import { runInThisContext } from "node:vm"

import { audioFileName, audioPath } from "./audio-name.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const contentRoot = join(root, "content")
const publicRoot = join(root, "public")

const check = process.argv.includes("--check")
const trackArg = process.argv.indexOf("--track")
const track = trackArg >= 0 ? process.argv[trackArg + 1] : "es"
const engineArg = process.argv.indexOf("--engine")
const engine = engineArg >= 0 ? process.argv[engineArg + 1] : "piper"

/** The piper voice: a neural Spanish voice. */
const PIPER_MODEL =
  process.env.PIPER_MODEL ?? join(homedir(), ".cache", "language-app", "piper", "es_ES-sharvard-medium.onnx")

/** The sample rate both engines speak at. */
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
 * The espeak voice.
 *
 * The synthesiser speaks in chunks and asks whether to carry on: answering
 * "no" is what continues it, so the whole utterance arrives.
 */
async function createEspeakVoice() {
  const { default: createEspeakModule } = await import("@echogarden/espeak-ng-emscripten")
  const module = await createEspeakModule()
  const worker = new module.eSpeakNGWorker()

  worker.set_voice("roa/es")
  worker.set_rate(1.0)
  worker.set_pitch(1.0)
  worker.set_range(1.0)

  return {
    name: "espeak",
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

      return { samples: audio, rate: SAMPLE_RATE }
    },
  }
}

/**
 * The piper voice.
 *
 * The model is loaded once by a Python helper, which writes a WAV per word.
 * Anything that cannot find the model says so, and the caller falls back to
 * the bundled voice rather than failing the build.
 */
function createPiperVoice(words) {
  if (!existsSync(PIPER_MODEL)) {
    console.warn(`  no piper model at ${PIPER_MODEL}, using the bundled voice instead`)
    return null
  }

  const workDir = join(root, ".audio-cache")
  const wordsFile = join(workDir, "words.json")

  mkdirSync(workDir, { recursive: true })
  writeFileSync(wordsFile, JSON.stringify(words), "utf8")

  console.log("  speaking with the neural voice (piper)")

  try {
    execFileSync(
      "python",
      [
        join(root, "scripts", "piper-speak.py"),
        "--model",
        PIPER_MODEL,
        "--out",
        workDir,
        "--words",
        wordsFile,
      ],
      { cwd: root, stdio: "inherit" },
    )
  } catch (error) {
    console.warn(`  piper failed (${String(error).slice(0, 120)}), using the bundled voice instead`)
    return null
  }

  return {
    name: "piper",
    speak(text, index) {
      const path = join(workDir, `${index}.wav`)
      if (!existsSync(path)) return null

      return readWav(path)
    },
  }
}

/** A WAV file, as its samples and its sample rate. */
function readWav(path) {
  const wav = readFileSync(path)

  const channels = wav.readUInt16LE(22)
  const rate = wav.readUInt32LE(24)
  const bits = wav.readUInt16LE(34)

  let offset = 12
  let length = 0

  while (offset + 8 <= wav.length) {
    const id = wav.toString("ascii", offset, offset + 4)
    const size = wav.readUInt32LE(offset + 4)

    if (id === "data") {
      length = size
      break
    }

    offset += 8 + size + (size % 2)
  }

  const bytes = wav.subarray(offset + 8, offset + 8 + length)
  const samples = new Int16Array(length / 2)

  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = bytes.readInt16LE(index * 2)
  }

  if (channels > 1) {
    const mono = new Int16Array(Math.floor(samples.length / channels))

    for (let index = 0; index < mono.length; index += 1) {
      mono[index] = samples[index * channels]
    }

    return { samples: mono, rate }
  }

  return { samples, rate }
}

/** The MP3 bytes of some 16-bit samples. */
function encodeMp3(samples, rate = SAMPLE_RATE) {
  const encoder = new lamejs.Mp3Encoder(1, rate, BIT_RATE)
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

  let voice = engine === "piper" ? createPiperVoice(words) : null
  if (!voice) voice = await createEspeakVoice()

  let written = 0
  let bytes = 0

  for (const [index, word] of words.entries()) {
    const spoken = voice.speak(word, index)
    if (!spoken) continue

    const mp3 = encodeMp3(spoken.samples, spoken.rate)

    writeFileSync(join(audioRoot, audioFileName(word)), mp3)
    written += 1
    bytes += mp3.length

    if (written % 100 === 0) {
      console.log(`  ${written} of ${words.length} words`)
    }
  }

  // The record of what spoke each word. A native recording drops in beside
  // it and marks itself here.
  writeFileSync(
    join(audioRoot, "voices.json"),
    `${JSON.stringify({ engine: voice.name, words: Object.fromEntries(words.map((word) => [word, voice.name])) }, null, 2)}\n`,
    "utf8",
  )

  rmSync(join(root, ".audio-cache"), { recursive: true, force: true })

  console.log(
    `wrote ${written} recordings for ${track} with ${voice.name} (${Math.round(bytes / 1024)} KB) to ${audioRoot.replace(root + "\\", "")}`,
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

if (!check && words.length > 0) {
  console.log(`example: ${audioPath(track, words[0])}`)
}
