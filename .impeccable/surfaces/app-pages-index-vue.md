---
version: 1
slug: "app-pages-index-vue"
primary_target: "app/pages/index.vue"
related_targets: ["app/pages/lesson/[track]/[level]/[unit].vue","app/pages/practice.vue"]
---

# Surface brief — dashboard (`app/pages/index.vue`)

Related: `app/pages/lesson/[track]/[level]/[unit].vue`, `app/pages/practice.vue`.

## Direction contract

**THESIS.** The dashboard is a quiet desk, not a street or a game board. One learner opens it daily to do one unit; the page answers three questions in order: what do I do now, what needs another look, where am I on the 132-unit path. The category default — a card grid with one accent, Duolingo-like — is the rut this refuses while keeping its clarity.

**OWN-WORLD.** Cool paper ground, ink text, one deep-green accent, gold reserved for the single primary action. Archivo for the interface; the display face speaks once, for the unit you are on. No shadows-as-decoration, no ornament competing with the path. The one signature move: the current unit is set large, everything else steps back.

**STORY.** The learner understands in seconds: the Continue card names today's unit, the progress row says how far along the path they are, Worth another look appears only when weak units exist, Practice shows due and shaky counts, and the level ladder below opens at the level they are working in.

**FIRST VIEWPORT.** Header (wordmark, sub-line, Streak/XP chips); the Continue card with its gold action; the path progress bar; the review card when there is one; the practice pair; the start of the Spanish ladder with the current level expanded and the current unit marked.

**FORM.** Code-led build of a user-pinned direction. seed: none (user-pinned; the concept-seed roll was set aside when the user rejected that hand in favour of verified real-world references: busuu.com structure, wanikani.com progression).

**FINISH.** Unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
