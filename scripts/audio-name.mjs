/**
 * Where the recording of a word lives.
 *
 * The name is derived from the word itself, so the thing that builds the
 * content and the thing that builds the audio always agree, and neither of
 * them needs a manifest to look the other up.
 */

/** A safe file name: lowercase, no accents, no punctuation. */
export function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * A short stable hash, so two different words never share a file name.
 *
 * "cafe" and "café" slug to the same thing, and they are different words
 * to the learner, so the hash tells them apart.
 */
export function fingerprint(text) {
  let value = 2166136261

  for (let index = 0; index < text.length; index += 1) {
    value = (value ^ text.charCodeAt(index)) * 16777619
  }

  return (value >>> 0).toString(16).padStart(8, "0")
}

/** The file name of the recording of a word. */
export function audioFileName(word) {
  return `${slugify(word)}-${fingerprint(word)}.mp3`
}

/** The public path of the recording of a word, as the client asks for it. */
export function audioPath(track, word) {
  return `/audio/${track}/${audioFileName(word)}`
}
