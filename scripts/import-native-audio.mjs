/**
 * Install a human recording of a word.
 *
 * The course's default voice is synthesised. A recording made by a person
 * beats it, and because the file name of every recording is derived from the
 * word itself, a native recording drops straight in: name the file after the
 * word, put it in a folder, and run this.
 *
 *   node scripts/import-native-audio.mjs <folder>
 *
 * The folder holds one file per word, named after the word:
 *
 *   hola.wav
 *   el cafe.mp3
 *   buenos dias.wav
 *
 * A WAV is converted to the same MP3 the synthesised voice uses, so the app
 * cannot tell the difference. An MP3 is copied as it is. The word then speaks
 * with a human voice, and the record of who spoke it is updated.
 *
 * Nothing else changes: the content, the client and the URLs are the same.
 */
import { copyFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { dirname, extname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import { runInThisContext } from "node:vm"

import { audioFileName } from "./audio-name.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const contentRoot = join(root, "content")
const audioRoot = join(root, "public", "audio", "es")

const folder = process.argv[2]

if (!folder) {
  console.error("usage: node scripts/import-native-audio.mjs <folder>")
  console.error("the folder holds one file per word, named after the word")
  process.exit(1)
}

if (!existsSync(folder)) {
  console.error(`no such folder: ${folder}`)
  process.exit(1)
}

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

/** Every word of the Spanish track. */
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

  return [...new Set(words)]
}

/** The file name and the word are the same thing, in a forgiving way. */
function normalise(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** A WAV file, as its samples and its sample rate. */
function readWav(path) {
  const wav = readFileSync(path)

  const channels = wav.readUInt16LE(22)
  const rate = wav.readUInt32LE(24)

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
function encodeMp3(samples, rate) {
  const encoder = new lamejs.Mp3Encoder(1, rate, 32)
  const parts = []

  for (let offset = 0; offset < samples.length; offset += 1152) {
    const chunk = encoder.encodeBuffer(samples.subarray(offset, offset + 1152))
    if (chunk.length > 0) parts.push(Buffer.from(chunk))
  }

  const last = encoder.flush()
  if (last.length > 0) parts.push(Buffer.from(last))

  return Buffer.concat(parts)
}

const words = wordsOf("es")
const byName = new Map(words.map((word) => [normalise(word), word]))

const voicesPath = join(audioRoot, "voices.json")
const voices = existsSync(voicesPath)
  ? JSON.parse(readFileSync(voicesPath, "utf8"))
  : { engine: "synthesised", words: {} }

let installed = 0
const unused = []

for (const file of readdirSync(folder)) {
  const extension = extname(file).toLowerCase()
  if (extension !== ".wav" && extension !== ".mp3") continue

  const name = file.slice(0, -extension.length)
  const word = byName.get(normalise(name))

  if (!word) {
    unused.push(file)
    continue
  }

  const source = join(folder, file)
  const target = join(audioRoot, audioFileName(word))

  if (extension === ".mp3") {
    copyFileSync(source, target)
  } else {
    const spoken = readWav(source)
    writeFileSync(target, encodeMp3(spoken.samples, spoken.rate))
  }

  voices.words[word] = "native"
  installed += 1
  console.log(`  ${word} <- ${file} (${Math.round(statSync(target).size / 1024)} KB)`)
}

writeFileSync(voicesPath, `${JSON.stringify(voices, null, 2)}\n`, "utf8")

console.log(`installed ${installed} native recording(s)`)

if (unused.length > 0) {
  console.log(`left alone, no word matches: ${unused.join(", ")}`)
}
