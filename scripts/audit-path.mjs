/**
 * Audit the path for gaps.
 *
 * "Gapless" means three things, and this checks all three:
 *
 *  1. Structural: every level runs from unit 1 with no missing numbers, the
 *     levels are in order, and every unit holds ten exercises.
 *  2. Conceptual: no unit talks about a grammar point before the unit that
 *     teaches it. A forward reference is a hole in the path.
 *  3. Complete: every unit has a lesson, some examples, and some drills.
 *
 * The concept map below is the syllabus. It says which unit teaches what, so
 * the audit can find a unit that mentions the subjunctive three units before
 * the subjunctive is taught.
 */
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const contentRoot = join(root, "content")

/** The order the levels are walked in. */
const LEVEL_ORDER = ["A0", "A1", "A2", "B1", "B2"]

/**
 * The syllabus: a concept, the words that signal it, and where it is taught.
 *
 * `teaches` is the unit that introduces the concept. The first matching
 * keyword decides it, so the wording of each unit has to stay stable.
 */
const CONCEPTS = [
  { id: "articles", teaches: "A1/1", keywords: [/\bart[íi]culos?\b/i, /\bel o la\b/i] },
  { id: "plural", teaches: "A1/1", keywords: [/\bplural\b/i] },
  { id: "ser", teaches: "A1/3", keywords: [/\bverb ser\b/i, /\bsoy\b/i] },
  { id: "estar", teaches: "A1/3", keywords: [/\bverb estar\b/i, /\bestoy\b/i] },
  { id: "present", teaches: "A1/4", keywords: [/\bpresent tense\b/i, /\bpresente\b/i] },
  { id: "por/para", teaches: "A2/10", keywords: [/\bpor y para\b/i, /\bpor vs para\b/i] },
  { id: "prepositions of place", teaches: "A1/9", keywords: [/\bprepositions of place\b/i] },
  { id: "future", teaches: "A2/12", keywords: [/\bfuture tense\b/i, /\bfuturo\b/i] },
  { id: "preterite", teaches: "A2/13", keywords: [/\bpreterite\b/i] },
  { id: "preterite -er/-ir", teaches: "A2/14", keywords: [/\bpreterite with -er and -ir\b/i] },
  { id: "imperfect", teaches: "A2/15", keywords: [/\bimperfecto\b/i] },
  { id: "imperative", teaches: "A2/16", keywords: [/\bimperativo\b/i, /\bcommand\b/i] },
  { id: "perfect", teaches: "A2/17", keywords: [/\bpreterito perfecto\b/i, /\bperfect subjunctive\b/i] },
  { id: "participle", teaches: "A2/17", keywords: [/\bparticiple\b/i, /\bparticipio\b/i] },
  { id: "progressive", teaches: "B1/3", keywords: [/\bgerund\b/i, /\bprogressive\b/i] },
  { id: "direct object", teaches: "B1/4", keywords: [/\bobject pronouns?\b/i, /\bpronombre de objeto directo\b/i] },
  { id: "reflexive", teaches: "B1/6", keywords: [/\breflexive\b/i] },
  { id: "comparisons", teaches: "B1/8", keywords: [/\bsuperlative\b/i, /\bcomparisons?\b/i] },
  { id: "indirect object", teaches: "B1/9", keywords: [/\bindirect object pronouns?\b/i] },
  { id: "conditional", teaches: "B1/10", keywords: [/\bconditional\b/i, /\bcondicional\b/i] },
  { id: "subjunctive", teaches: "B1/11", keywords: [/\bsubjunctive\b/i, /\bsubjuntivo\b/i] },
  { id: "reported speech", teaches: "B1/12", keywords: [/\breported speech\b/i, /\bestilo indirecto\b/i] },
  { id: "relative clauses", teaches: "B1/13", keywords: [/\brelative clauses?\b/i, /\bpartículas relativas\b/i] },
  { id: "pluperfect", teaches: "B1/14", keywords: [/\bpluperfect\b/i, /\bpluscuamperfecto\b/i] },
  { id: "passive", teaches: "B2/1", keywords: [/\bpassive voice\b/i, /\bvoz pasiva\b/i] },
  { id: "past subjunctive", teaches: "B2/2", keywords: [/\bpast subjunctive\b/i] },
  { id: "compound infinitive", teaches: "B2/4", keywords: [/\bcompound infinitive\b/i] },
  { id: "nominalisation", teaches: "B2/6", keywords: [/\bnominalisation\b/i, /\bnominalización\b/i] },
  { id: "connectors", teaches: "B2/7", keywords: [/\bconnectors?\b/i, /\bconectores\b/i] },
  { id: "adjective position", teaches: "B2/8", keywords: [/\badjective position\b/i, /\bposición de los adjetivos\b/i] },
  { id: "formal register", teaches: "B2/12", keywords: [/\bformal register\b/i, /\bregistro formal\b/i] },
]

const problems = []
const notes = []

function collectText(unit) {
  const parts = [
    unit.title,
    unit.description,
    unit.grammar,
    unit.grammarNote,
    unit.explanation?.summary ?? "",
    ...(unit.explanation?.sections ?? []).map((s) => `${s.heading} ${s.body ?? ""} ${(s.examples ?? []).map((e) => `${e.es} ${e.en}`).join(" ")}`),
    ...(unit.items ?? []).map((i) => `${i.es} ${i.en} ${i.note ?? ""}`),
    ...(unit.drills ?? []).map((d) => `${d.prompt} ${d.answer} ${d.meaning} ${d.note ?? ""}`),
  ]
  return parts.join("\n")
}

/**
 * Only the teaching prose counts as a mention.
 *
 * A vocabulary item that happens to contain the word plural, or an example
 * sentence, is not a hole in the path. A lesson that explains a concept
 * before it has been taught is.
 */
function collectProse(unit) {
  return [
    unit.title,
    unit.description,
    unit.grammar,
    unit.grammarNote,
    unit.explanation?.summary ?? "",
    ...(unit.explanation?.sections ?? []).map((s) => `${s.heading} ${s.body ?? ""}`),
  ].join("\n")
}

/**
 * A sentence that points forward to where a concept is taught.
 *
 * Using a phrase before its grammar is not a hole if the lesson says so. A
 * beginner unit that teaches "estoy bien" and then says the verb arrives in
 * A1 is doing the right thing.
 */
const FORWARD =
  /\b(?:in|from|at)\s+(?:A[0-2](?:\/\d+)?|B[12](?:\/\d+)?|the path)\b|you will meet|arrives? in|comes? in|later in the path/i

const path = []

for (const track of readdirSync(contentRoot, { withFileTypes: true }).filter((e) => e.isDirectory())) {
  for (const level of LEVEL_ORDER) {
    const levelDir = join(contentRoot, track.name, level)
    let entries
    try {
      entries = readdirSync(levelDir)
        .filter((f) => f.endsWith(".vocab.json"))
        .map((f) => {
          const unit = JSON.parse(readFileSync(join(levelDir, f), "utf8"))
          return { file: f, unit }
        })
        .sort((a, b) => a.unit.unit - b.unit.unit)
    } catch {
      continue
    }
    for (const { unit } of entries) {
      path.push({
        key: `${track.name}/${level}/${unit.unit}`,
        track: track.name,
        level,
        unit: unit.unit,
        unitData: unit,
        text: collectText(unit),
        prose: collectProse(unit),
      })
    }
  }
}

// 1. structural
for (const track of new Set(path.map((u) => u.track))) {
  for (const level of LEVEL_ORDER) {
    const units = path.filter((u) => u.track === track && u.level === level).map((u) => u.unit).sort((a, b) => a - b)
    if (units.length === 0) continue
    for (const [index, unit] of units.entries()) {
      if (unit !== index + 1) {
        problems.push(`${track}/${level}: unit numbers are not contiguous, expected ${index + 1} and found ${unit}`)
      }
    }
    notes.push(`${track}/${level}: ${units.length} units, 1..${units.length}`)
  }
}

// 2. conceptual
for (const unit of path) {
  const announces = FORWARD.test(`${unit.unitData.grammarNote} ${unit.unitData.description}`)

  for (const concept of CONCEPTS) {
    if (unit.level + "/" + unit.unit === concept.teaches) continue

    const taughtAt = path.findIndex((u) => u.level + "/" + u.unit === concept.teaches)
    const here = path.findIndex((u) => u.key === unit.key)

    if (taughtAt < 0) {
      problems.push(`${unit.key}: mentions "${concept.id}" but no unit teaches it`)
      continue
    }

    for (const sentence of unit.prose.split(/(?<=[.!?])\s+/)) {
      if (!concept.keywords.some((keyword) => keyword.test(sentence))) continue

      if (FORWARD.test(sentence)) {
        notes.push(`${unit.key}: points forward to ${concept.teaches} for "${concept.id}"`)
        continue
      }
      if (announces) {
        notes.push(`${unit.key}: uses "${concept.id}" as a phrase and announces it comes later`)
        continue
      }
      if (here < taughtAt) {
        problems.push(
          `${unit.key}: uses "${concept.id}" before ${concept.teaches} — "${sentence.trim().slice(0, 90)}"`,
        )
      }
    }
  }
}

// 3. complete
for (const unit of path) {
  if (!unit.unitData.explanation) problems.push(`${unit.key}: has no lesson`)
  if (!unit.unitData.drills?.length) problems.push(`${unit.key}: has no drills`)
  const examples = (unit.unitData.explanation?.sections ?? []).flatMap((s) => s.examples ?? [])
  if (examples.length === 0) problems.push(`${unit.key}: its lesson has no examples`)
  if (unit.unitData.items?.length !== 10) problems.push(`${unit.key}: ${unit.unitData.items?.length} words, expected 10`)
}

console.log("the path, in order:")
for (const note of notes.filter((n) => n.includes("units,"))) console.log("  " + note)

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`)
  for (const problem of problems) console.error("  " + problem)
  process.exit(1)
}

console.log("\nno gaps: every unit has a lesson, examples, drills and ten words, and nothing is used before it is taught")
