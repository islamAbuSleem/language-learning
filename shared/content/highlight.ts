/**
 * Spanish inside English prose.
 *
 * The lessons explain the grammar in English and show it in Spanish, often
 * in the same sentence: "Usually el is masculine and la is feminine." The
 * learner has to see at a glance which words are Spanish, so the renderer
 * marks them and paints them pine.
 *
 * Three tiers, in order:
 *
 * 1. The unit's own words. If a sentence uses one of the ten words the unit
 *    teaches, it is Spanish. Phrases come before single words, so "pasta de
 *    dientes" wins over "de".
 * 2. Accents. A token carrying á, é, í, ó, ú, ü, ñ, ¿ or ¡ is Spanish: the
 *    English in this course never uses them.
 * 3. A short stoplist of function words: el, la, de, en, y, que and the
 *    like. Each one was checked against every lesson in the course for an
 *    English use, and the ones with one were left out: "no" ("there is no
 *    article"), "a" (the English article), "me" ("close to me"), "o" and
 *    "u" ("ends in -o"), "e" ("e.g.").
 *
 * Matching is case-insensitive with Unicode word boundaries, and the text
 * comes back unchanged: only the split points are new.
 */
export interface ProseSegment {
  text: string
  spanish: boolean
}

/**
 * Function words that are never English in this course.
 *
 * Do not extend this list by feel: every entry was audited against all 132
 * units (scripts audited, hits reviewed in context). A word with an English
 * use stays out even if it costs a highlight.
 */
export const SPANISH_FUNCTION_WORDS = [
  "el",
  "la",
  "los",
  "las",
  "lo",
  "un",
  "una",
  "del",
  "al",
  "es",
  "son",
  "soy",
  "eres",
  "somos",
  "hay",
  "estoy",
  "estás",
  "está",
  "estamos",
  "están",
  "ser",
  "estar",
  "tengo",
  "tiene",
  "tienen",
  "quiero",
  "quiere",
  "puedo",
  "puede",
  "voy",
  "vas",
  "va",
  "vamos",
  "van",
  "hacer",
  "hace",
  "hacen",
  "por",
  "para",
  "con",
  "sin",
  "sobre",
  "entre",
  "hasta",
  "desde",
  "que",
  "porque",
  "aunque",
  "pero",
  "muy",
  "más",
  "menos",
  "tan",
  "como",
  "cada",
  "todo",
  "todos",
  "todas",
  "algo",
  "nada",
  "alguien",
  "nadie",
  "siempre",
  "nunca",
  "también",
  "hoy",
  "mañana",
  "ayer",
  "ahora",
  "después",
  "antes",
  "aquí",
  "allí",
  "ahí",
  "mi",
  "tu",
  "su",
  "mis",
  "tus",
  "sus",
  "este",
  "esta",
  "estos",
  "estas",
  "ese",
  "esa",
  "eso",
  "te",
  "nos",
  "les",
  "se",
  "le",
  "de",
  "en",
  "y",
  "si",
  "ni",
]

const ACCENTED_TOKEN = "\\p{L}*[áéíóúüñÁÉÍÓÚÜÑ¿¡]\\p{L}*"

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** The one pattern all three tiers share. */
function prosePattern(words: readonly string[]): RegExp {
  const phrases = [...words].sort((a, b) => b.length - a.length).map(escapeRegExp)
  const functions = SPANISH_FUNCTION_WORDS.map(escapeRegExp)

  return new RegExp(
    `(?<!\\p{L})(${[...phrases, ...functions].join("|")}|${ACCENTED_TOKEN})(?!\\p{L})`,
    "giu",
  )
}

/**
 * Split prose into English and Spanish segments.
 *
 * `words` are the unit's own Spanish words (its `es` items). Without them
 * only the accents and the function words mark Spanish, which is the right
 * fallback for a feedback note that outlives its unit.
 */
export function splitProse(text: string, words: readonly string[] = []): ProseSegment[] {
  if (text.length === 0) return []

  const pattern = prosePattern(words)
  const segments: ProseSegment[] = []
  let rest = 0
  let match: RegExpExecArray | null

  pattern.lastIndex = 0
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > rest) {
      segments.push({ text: text.slice(rest, match.index), spanish: false })
    }
    segments.push({ text: match[0], spanish: true })
    rest = match.index + match[0].length

    if (match[0].length === 0) pattern.lastIndex += 1
  }

  if (rest < text.length) {
    segments.push({ text: text.slice(rest), spanish: false })
  }

  return segments.filter((segment) => segment.text.length > 0)
}
