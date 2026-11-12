# Findings ledger — Duolingo method study

Every conclusion about the reference app links to a REA `evidence_id`.
Claim types: **observed** (a capture shows it) · **inferred** (our design decision) · **unknown**.

## Evidence index

| Evidence ID | Target | What it covers | Captured |
| --- | --- | --- | --- |
| `ev_41168b7c13e78c8…` | `www.duolingo.com/` (target `54503C0F…`) | CDP browser target list, Chrome 157 | 2026-11-12 |
| `ev_ae4dc5338d988b2…` | `www.duolingo.com/lesson` | Lesson screen accessibility tree | 2026-11-12 |
| `ev_08f7522a76ee3b18…` | `www.duolingo.com/lesson` | Lesson screen + localStorage key inventory | 2026-11-12 |
| `ev_0a6b084345210be4…` | `www.duolingo.com/settings/social` | Settings page + storage (Rive cache seen) | 2026-11-12 |

## Findings

| # | Claim | Type | Evidence | Notes / limitations |
| --- | --- | --- | --- | --- |
| 1 | Reference app is a React SPA served from `www.duolingo.com` | observed | `ev_41168b7c13e78c8…` | Page title + URL only; 8 non-page targets excluded from discovery |
| 2 | Lesson screen = progress bar → running counter → item badge → question heading → single-choice radio group | observed | `ev_ae4dc5338d988b2…` | A11y tree only. A11y gave no named nodes on the settings page — extractor needs fixing |
| 3 | Multiple-choice question renders as `radiogroup` named **`choice`** with one `radio` per option | observed | `ev_ae4dc5338d988b2…` | 3 options in the captured question |
| 4 | Question framing uses the target word plus a quoted gloss; UI language is a separate concern from content language | observed | `ev_ae4dc5338d988b2…` | Arabic UI asked which option was the Spanish word for "coffee" |
| 5 | The item badge distinguishes a **new** item from a review item | observed | `ev_ae4dc5338d988b2…` | Badge read "new word" |
| 6 | Client state keys: `duo.state`, `duo.dailyQuests`, `duo.clientSideGradingConfig`, `duo.avatarsIntro`, `duo.sentryThrottling`, `duo.ageRestrictedLeaderboards`, `duo.lastLogin` | observed | `ev_08f7522a76ee3b18…` | Key **names** only; values redacted by REA |
| 7 | Course identity is stored per (course, UI language) as `duo.delphi.history.<userId>.<COURSE_ID>`; this account is `DUOLINGO_ES_AR` | observed | `ev_08f7522a76ee3b18…` | Spanish-for-Arabic course |
| 8 | Client-side grading is configured locally (`duo.clientSideGradingConfig` + timestamp) | observed | `ev_08f7522a76ee3b18…` | Not yet established what it grades |
| 9 | Mascot/UI animation assets are cached per release as `lottie-v<release>` and `rive-v<release>` | observed | `ev_0a6b084345210be4…` | Both runtimes present; Rive appeared on the settings page |
| 10 | Analytics on the page: `adjust-sdk` (IndexedDB + localStorage) | observed | `ev_08f7522a76ee3b18…` | Third-party attribution SDK |
| 11 | Switching account language to English yields a **different course** (`DUOLINGO_ES_EN`) with its own content order and streak | inferred (known behaviour, **not** observed here) | — | To be confirmed on screen |

## Open questions

- [ ] Lesson loop: what are the exercise types (multiple choice, type-in, match, listen, speak)?
- [ ] Progress bar / hearts / XP accounting — what is awarded when?
- [ ] Streak: what breaks it, what preserves it, what is the freeze/thaw rule?
- [ ] League: how ranking and promotion work, and the time window?
- [ ] SRS: how does it pick what to drill, and how does difficulty adapt?
- [ ] What is the onboarding flow, and what does it ask the learner to choose?
- [ ] Which of Spanish / German / English are actually offered with an **English** interface?
- [ ] What does `duo.state` hold? (Probably the persisted learner profile.)

## Method notes

- REA route for this target: **live web app** → CDP browser observation
  (`list_browser_targets` → `capture_browser_scenario` / `inspect_web_page`).
- Chrome must run with `--remote-debugging-port=9222` and a dedicated `--user-data-dir`
  (Chrome 136+ refuses remote debugging on the default profile).
- Profile used: `%LOCALAPPDATA%\Temp\opencode\rea-duolingo-profile` — holds session
  cookies, stays out of git.
- REA never exposes credential header values or storage values; the exposed API surface is
  the one we capture deliberately.
