# Design — Quiet Desk

<!-- impeccable:design-schema 1 -->

The visual world of the app, recorded from the built code. PRODUCT.md owns
product truth; this file owns durable visual decisions. The direction
contract lives in `.impeccable/surfaces/app-pages-index-vue.md`.

## World

Quiet Desk: cool paper ground (`--color-paper` `#F1F2ED`), ink text
(`--color-ink` `#17191C`), one deep pine green (`--color-accent` `#0F3A2C`,
strong `#0A2A20`, soft `#E3EBE4`, on-accent cream `#F7F3E8`) and one gold
(`--color-gold` `#D8A63C`, strong `#B8892B`, soft `#F7ECD4`, on-gold ink
`#17170F`). Correct is emerald `#1E6B4B` on `#E0F0E4`; wrong is brick
`#A8322A` on `#F9E6E2`. Nothing is lifted from the reference app.

Gold is the one primary action per viewport (Continue, Check, Do it again).
Everything else is quiet: pine for state and identity, ink for text.

## Type

- Interface: **Archivo** 400/500/700/800, self-hosted from `public/fonts/`
  (latin + latin-ext, OFL licences beside them). Never a hosted font URL.
- Display: **Alfa Slab One** 400, speaking exactly once per surface — the
  unit you are on (dashboard Continue title, lesson reading title, done
  headlines). Never for body, never for chrome.
- Reading: **Faustina** for lesson prose and example bodies — the one place
  the learner reads at length.
- Body 16px/1.6, prose capped at 65ch. Metadata labels are 0.68–0.75rem,
  weight 700, uppercase, 0.08–0.1em tracking. Display never tracks negative.
  All numerals that move (scores, counts, XP, streaks) are tabular.

## Elevation and state

One system: 1px hairline borders (`--color-line`, strong variant for
controls), 12–16px card radii, 8px pills only for tiny labels and the play
button. No shadows anywhere. Current unit: pine-soft fill; done unit: pine
circle with cream check icon; weak unit: gold-soft circle; locked unit: lock
icon, soft text. Selected choice: pine border on pine-soft; matched pair:
emerald. No element uses a colored border wider than 1px.

## Interaction

- Focus: 3px pine outline, 2px offset, everywhere (holds on gold too).
- Links: offset underline (3px/1px); buttons and card-links have none.
- Hover states on every control; active press sinks the primary button 1px.
- `prefers-reduced-motion`: transitions and animation collapse to 0.01ms.
- Browser chrome is themed: gold-tinted selection, thin thumb scrollbar,
  pine focus, offset underlines.

## Icons

`app/components/AppIcon.vue`: lock, check, chevron, speaker, back. Inline
SVG, one 1.75px round stroke, currentColor. No emoji or glyph stands in for
an icon anywhere.

## Responsive

760px dashboard column, 680px lesson column, centered on the paper ground.
Practice cards reflow by auto-fit; the Continue card stacks; below 560px the
unit descriptions hide and rows keep number, title and state. Verified at
1440×1000, 900×1100 and 390×844 (desktop, lesson, mobile captures in
`docs/screenshots/30–33`).

## What must not regress

- The display face speaks once. A second Alfa Slab headline on a page is a
  regression, not an addition.
- Gold stays on the primary action. A gold badge, gold tab or gold ornament
  anywhere else dilutes the one promise gold makes.
- No shadows, no >1px colored borders, no emoji icons. The detector
  (`impeccable detect --json` over the CSS and Vue files) must stay empty.
