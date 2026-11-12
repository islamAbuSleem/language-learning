# Findings ledger — Duolingo method study

Every conclusion about the reference app links to a REA `evidence_id`.
Claim types: **observed** (a capture shows it) · **inferred** (our design decision) · **unknown** (not established).

Target: `https://www.duolingo.com` — live web app, observed via CDP (Chrome 157, target `54503C0FED484DAFEDA64D24500DF337`).

## Scope

Our app: **Spanish, German and English tracks for English speakers**, original content, no paywall.
Reference mechanics only — never their content, art, audio, brand, or API contract.

## Evidence index

| Evidence ID | Target | What it covers |
| --- | --- | --- |
| `ev_41168b7c13e78c8…` | `/` | CDP browser target list, Chrome 157 |
| `ev_ae4dc5338d988b2…` | `/lesson` | Lesson screen accessibility tree (Arabic UI) |
| `ev_08f7522a76ee3b18…` | `/lesson` | Lesson screen + localStorage key inventory |
| `ev_0a6b084345210be4…` | `/settings/social` | Settings page + storage (Rive cache seen) |
| `ev_5d957260929c2901…` | `/settings/account` | Account settings DOM + a11y |
| `ev_9b5ec5d0b4c71b50…` | `/settings/account` | Account settings, headings + test hooks |
| `ev_62c1b70a7369b052…` | `/settings/courses` | Enrolled courses list |
| `ev_ca7bfc2959559d16…` | `/settings/profile` | Profile form (contains personal data — not recorded here) |
| `ev_879873ce9379cb27…` | `/settings/account` | Full settings page: no language control exists |
| `ev_0e2dd9eca68587b5…` | `/learn` | Cookie inventory (hashed values) — `lang` cookie found |
| `ev_614cda278ce14ee4…` | `/learn` | Cookie-seeded `lang=en` — **server ignored it** |
| `ev_424a1155d063872f…` | `/courses` | English course catalogue, 42 courses + source combobox |
| `ev_0dba29a091279dd6…` | `/enroll/es/en` | Enroll route → redirects to `/learn`, UI switches to English |
| `ev_7d5e0ee6ac87f8a5…` | `/enroll/de/en` | German-from-English enroll → active course switched |
| `ev_47bf6dae7a0e41bc…` | `/enroll/de/en/Learn-German` | German course active, English UI |
| `ev_0e43b4e92cc16880…` | `/learn` | Dashboard in English, German course active |
| `ev_1418c1051d5ce217…` | `/enroll/en/en/Learn-English` | English course enrolled, becomes active |
| `ev_840219000d0e5323…` | `/learn` | localStorage after switching courses |

## Findings — lesson loop

| # | Claim | Type | Evidence |
| --- | --- | --- | --- |
| L1 | Lesson screen = progress bar → hearts counter → item badge → question heading → answer area | observed | `ev_1dfc24e4c77c5e8f…` |
| L2 | Multiple-choice renders as `radiogroup "choice"` with one `radio` per option; the option label carries a **keyboard shortcut suffix** (`gato 3` = press 3) | observed | `ev_1dfc24e4c77c5e8f…` |
| L3 | Question framing quotes the target word and asks which option matches it; UI language is independent of content language | observed | `ev_ae4dc5338d988b2…` |
| L4 | Items are badged as **new** vs review | observed | `ev_ae4dc5338d988b2…` |
| L5 | A **unit is 10 exercises** (unit progressbar reads `0 / 10`) | observed | `ev_485eac0f09a203be…` |
| L6 | **Skip is free** — hearts stayed at 5 across 10+ skipped exercises | observed | `ev_320cf0f5ac7cef14…` |
| L7 | Skipping reveals the answer plus the full feedback panel: `Correct solution: <answer>`, **Too easy**, **Too difficult**, **Report**, **Continue** | observed | `ev_2a9ec70af799e30d…`, `ev_320cf0f5ac7cef14…` |
| L8 | **"Too easy" / "Too difficult" is an explicit learner self-grade of item difficulty** — the SRS signal, asked on every item | observed | `ev_2a9ec70af799e30d…` |
| L9 | Exercise types observed: **`select`** (pick 1 of 3), **`match`** (pair two columns, 5 pairs seen), **`assist`** ("Select the correct meaning") | observed | `ev_320cf0f5ac7cef14…` |
| L10 | Challenge components are tagged `challenge challenge-<type>`; player chrome is `player-skip`, `player-next`, `quit-button` | observed | `ev_6581d2c38610221d…` |
| L11 | Lesson entry: clicking a path node opens a popover with the unit title, "Lesson N of 3", and a **"Start +10 XP"** link → `/lesson` | observed | `ev_485eac0f09a203be…` |
| L12 | Skill-path node kinds: `skill-path-level-skill` (Lesson), `-practice`, `-unit_review`, `-duo_radio` (Radio), plus a unit-test state `skill-path-state-unit_test` | observed | `ev_d2e938f4255f1326…` |
| L13 | Unit Review is a distinct node kind from Practice; a Chest (reward) node sits between them | observed | `ev_485eac0f09a203be…` |
| L14 | A **placement test** is offered before a section: "Pass this test to jump ahead to Unit 2!" → Maybe later / Let's go | observed | `ev_bd07277f102d0e9f…` |
| L15 | Onboarding self-assessment: `radiogroup "proficiency"` — "I'm new to Spanish", "I know some common words", … | observed | `ev_485eac0f09a203be…` |

## Findings — dashboard / persistent state

| # | Claim | Type | Evidence |
| --- | --- | --- | --- |
| D1 | Three stat chips: **streak**, **lingots** (currency), **hearts** (lives) — values 0 / 1000 / 5 | observed | `ev_0e43b4e92cc16880…` |
| D2 | **Leagues** are weekly competitive tiers; entry tier is **Bronze**; a lesson is needed to join | observed | `ev_0e43b4e92cc16880…` |
| D3 | **Daily Quests** panel on the dashboard | observed | `ev_0e43b4e92cc16880…` |
| D4 | Unit tree is a vertical **skill path**; units carry lessons and a *guidebook* link `/guidebook/<target>/<n>` | observed | `ev_44e78786d6d6990…` |
| D5 | Course sections are numbered ("SECTION 1", "UNIT 1"); each unit has a named lesson ("Introduce yourself and greet others") | observed | `ev_0e43b4e92cc16880…` |
| D6 | Super is the paywall: "No ads, personalized practice, and unlimited Legendary!" | observed | `ev_0e43b4e92cc16880…` |
| D7 | Client state keys: `duo.state`, `duo.dailyQuests`, `duo.clientSideGradingConfig` (+ timestamp), `duo.avatarsIntro`, `duo.sentryThrottling`, `duo.ageRestrictedLeaderboards`, `duo.lastLogin` | observed | `ev_08f7522a76ee3b18…` |
| D8 | Course history is stored per course as `duo.delphi.history.<userId>.<COURSE_ID>`; course id encodes target+source, e.g. `DUOLINGO_ES_AR` | observed | `ev_08f7522a76ee3b18…` |
| D9 | Grading config is client-side and timestamped — the lesson evaluator may run locally | observed | `ev_08f7522a76ee3b18…` |
| D10 | Mascot/UI animations cached per release as `lottie-v<release>` and `rive-v<release>` (both runtimes) | observed | `ev_0a6b084345210be4…` |
| D11 | Third-party analytics present: `adjust-sdk` (IndexedDB + localStorage) | observed | `ev_08f7522a76ee3b18…` |

## Findings — navigation and settings IA

| # | Claim | Type | Evidence |
| --- | --- | --- | --- |
| N1 | Primary nav: Learn, Leaderboards, Quests, Shop, Profile, More | observed | `ev_0e43b4e92cc16880…` |
| N2 | Settings IA: `/settings/account` (Preferences), `/settings/profile`, `/settings/notifications`, `/settings/courses` (Courses), `/settings/schools`, `/settings/social`, `/settings/privacy`, `/settings/super`, `/help` | observed | `ev_5d957260929c2901…` |
| N3 | Preferences → **Lesson experience**: three toggles — sound effects, motivational messages, listening exercises | observed | `ev_879873ce9379cb27…` |
| N4 | Preferences → **Appearance**: dark mode select (System / On / Off) | observed | `ev_879873ce9379cb27…` |
| N5 | `/settings/courses` lists enrolled courses, each with a delete button | observed | `ev_62c1b70a7369b052…` |
| N6 | `data-test` naming vocabulary: `home-nav`, `leaderboard-nav`, `quests-nav`, `shop-nav`, `profile-tab`, `more-nav`, `streak-stat`, `lingot-stat`, `hearts-stat`, `skill-path`, `skill-path-unit-N`, `guidebook-button-N`, `courses-menu`, `daily-quest`… | observed | `ev_03e3c54f6296bff1…` |
| N7 | UI is served per locale from ~30 subdomains (`ar`, `de`, `es`, `fr`, `ja`, …) plus `www` for English; `hreflang` alternates point at them | observed | `ev_62c1b70a7369b052…` |

## Findings — language and course selection

| # | Claim | Type | Evidence |
| --- | --- | --- | --- |
| C1 | **The interface language is not a user setting.** No language control exists anywhere in account, profile or courses settings | observed | `ev_879873ce9379cb27…`, `ev_ca7bfc2959559d16…`, `ev_62c1b70a7369b052…` |
| C2 | The UI language is stored in a `lang` cookie on `.duolingo.com` | observed | `ev_0e2dd9eca68587b5…` |
| C3 | **The server ignores a client-set `lang` cookie** — seeding `lang=en` left the page `lang="ar" dir="rtl"` | observed | `ev_614cda278ce14ee4…` |
| C4 | The UI language follows the **course source language**: `/courses` (English catalogue) renders `lang="en"`, while a course with an Arabic source renders `lang="ar"` | observed | `ev_424a1155d063872f…`, `ev_08f7522a76ee3b18…` |
| C5 | `/courses` = catalogue for a source language: heading "Courses for English Speakers", an **"I speak <language>"** combobox, and a tile per course | observed | `ev_424a1155d063872f…` |
| C6 | Course tile links are `/enroll/<target>/<source>/<slug>` (e.g. `/enroll/es/en/Learn-Spanish`) | observed | `ev_424a1155d063872f…` |
| C7 | Visiting an enroll route **enrolls the course and makes it active**, switching the UI to that course's source language | observed | `ev_0dba29a091279dd6…`, `ev_47bf6dae7a0e41bc…`, `ev_1418c1051d5ce217…` |
| C8 | 42 English-source courses exist, including all three of ours: Spanish, German, English (plus Chess, Math, Esperanto, Klingon, …) | observed | `ev_424a1155d063872f…` |
| C9 | Their English-source English course is `/enroll/en/en/Learn-English` | observed | `ev_1418c1051d5ce217…` |

## Findings — onboarding

| # | Claim | Type | Evidence |
| --- | --- | --- | --- |
| O1 | **Funboarding** is a modal onboarding flow with a Lottie-animated mascot | observed | `ev_7f1368a9a00d47d5…` |
| O2 | Onboarding asks a **placement question** ("what does the Spanish word *palabra* mean?") before starting | observed | `ev_7f1368a9a00d47d5…` |
| O3 | Onboarding offers **two entry paths**: `start-placement` (placement test) and `start-basics` (start from the beginning), plus a `prior-proficiency-card` | observed | `ev_03e3c54f6296bff1…` |
| O4 | A "Jump here?" / "Continue" choice appears on the dashboard for a returning learner | observed | `ev_0e43b4e92cc16880…` |

## Negative results (things that are *not* true)

| Claim checked | Outcome | Evidence |
| --- | --- | --- |
| "There's an in-app interface-language switcher" | **No** — absent from every settings page | `ev_879873ce9379cb27…` |
| "Setting the `lang` cookie flips the UI" | **No** — server overrides the client value | `ev_614cda278ce14ee4…` |
| "Enrolling is separate from switching the UI language" | **No** — one action does both | `ev_1418c1051d5ce217…` |

## Open questions

- [ ] Which **exercise types** exist (multiple choice, type-in, match, listen, speak, sentence order)? Only choice observed so far.
- [ ] Hearts: how many, what does a mistake cost, what regenerates them and on what timer?
- [ ] XP: how is it awarded, is it per lesson or per item, what are the tiers?
- [ ] Streak: what breaks it, what preserves it, what is the freeze/thaw rule?
- [ ] League: full tier list, ranking window, promotion/demotion rules, how the "Legendary" league differs.
- [ ] SRS: how item difficulty is estimated and how it picks what to drill.
- [ ] Quests: what a daily quest is, how progress is tracked, what rewards it gives.
- [ ] Guidebook: what per-unit tips it carries.
- [ ] What `duo.state` actually holds (persisted learner profile?).
- [ ] Placement test: how many questions, how it maps to a starting unit.

## Method notes

- REA route for this target: **live web app** → CDP browser observation.
- Chrome must run with `--remote-debugging-port=9222` and a dedicated `--user-data-dir`
  (Chrome 136+ refuses remote debugging on the default profile).
- Profile used: `%LOCALAPPDATA%\Temp\opencode\rea-duolingo-profile` — holds session cookies,
  stays out of git.
- Driving the app: `capture_browser_scenario`, connect mode.
  - `environment.service_workers` must be `"allow"` — the app registers a service worker and
    REA refuses to observe a service-worker-controlled page otherwise.
  - Cookie seeding shape: `{ name, value: { source: "literal", value: "…" },
    destination: { url: "https://…" }, http_only, same_site, secure }`.
  - `command_timeout_ms` must be raised (default 20 s is too short for a page that boots).
- Passive capture only sees activity **inside** its window (`prior_activity_available: false`).
  Use `capture_browser_scenario` for deterministic navigation, not racing the user.
- The funboarding modal intercepts pointer events over the whole nav — clicks on `more-nav`
  time out until it is closed.
- REA never exposes credential headers, cookie values or storage values; only key names.
  That is why C3 is a genuine negative result rather than a guess.
