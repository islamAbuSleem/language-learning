/**
 * Mapping orphaned item states onto current exercises.
 *
 * Exercise ids carry the word in a slug (`es/a1/u1/select/cafe`). An early
 * version of the generator slugified differently — the raw word went in,
 * accents and all (`select/café`) — and the shape plan has moved words
 * between shapes since. Both orphan rows: the learner answered them, but no
 * current exercise has that id, so the unit can never complete.
 *
 * The mapping here is deliberately conservative. A stale row moves only when
 * the same unit holds a current exercise for the same normalized word. The
 * shape is preferred but not required: a word the learner demonstrated is a
 * word demonstrated, whichever shape asked for it. Anything else stays
 * orphaned and is reported, never guessed at.
 */

/** Lowercase letters and digits only: the level on which two spellings meet. */
export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
}

/** A stale id, broken into the parts that locate its unit. */
export interface StaleExerciseId {
  track: string
  level: string
  unit: number
  shape: string
  slug: string
}

const STALE_PATTERN = /^([a-z0-9]+)\/([a-z0-9]+)\/u(\d+)\/(match|select|listen|type_in|drill)\/(.+)$/

export function parseStaleId(itemId: string): StaleExerciseId | null {
  const match = STALE_PATTERN.exec(itemId)
  if (!match) return null

  return {
    track: match[1] as string,
    level: (match[2] as string).toUpperCase(),
    unit: Number(match[3]),
    shape: match[4] as string,
    slug: match[5] as string,
  }
}

/** A current exercise, as the migration needs to see it. */
export interface CurrentExercise {
  id: string
  /** select, listen, type_in, match or drill. */
  shape: string
  /** The id's last segment, e.g. `cafe` or `3`. */
  slug: string
  /** Spanish texts shown by a match exercise, in display form. */
  pairTexts: string[]
}

/** A vocabulary item, for resolving a slug back to a word. */
export interface VocabularyItem {
  es: string
}

function normalizedWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[¿¡]/gu, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0)
}

/**
 * The current exercise that inherits a stale row, or null.
 *
 * In order: the same shape with the same normalized slug; any single-answer
 * shape (select, listen, type_in) with the same normalized slug; a match
 * exercise whose pairs show the word. Drill ids never move — a drill row
 * with a stale id is left alone for the caller to report.
 */
export function mapStaleIdToCurrent(
  stale: StaleExerciseId,
  exercises: readonly CurrentExercise[],
  vocabulary: readonly VocabularyItem[],
): string | null {
  const want = normalizeSlug(stale.slug)

  const sameShape = exercises.find(
    (exercise) => exercise.shape === stale.shape && normalizeSlug(exercise.slug) === want,
  )
  if (sameShape) return sameShape.id

  // Drills are positional: drill/3 is still drill/3, so a stale drill id is
  // a real riddle, not a rename. Never guess at it.
  if (stale.shape === "drill") return null

  // The word behind the slug, so a match exercise can be found by what it
  // shows rather than by what it is called.
  const word = vocabulary.find((item) => normalizeSlug(item.es) === want)

  const single = exercises.find(
    (exercise) =>
      (exercise.shape === "select" || exercise.shape === "listen" || exercise.shape === "type_in") &&
      normalizeSlug(exercise.slug) === want,
  )
  if (single) return single.id

  if (word) {
    const shown = normalizedWords(word.es)
    const match = exercises.find(
      (exercise) =>
        exercise.shape === "match" &&
        exercise.pairTexts.some((text) => {
          const words = normalizedWords(text)
          return shown.some((wanted) => words.includes(wanted))
        }),
    )
    if (match) return match.id
  }

  return null
}
