# Findings ledger — Duolingo method study

Every conclusion about the reference app links to a REA `evidence_id`.
Claim types: **observed** (a capture shows it) · **inferred** (our design decision) · **unknown**.

## Evidence index

| Evidence ID | Target | What it covers | Captured |
| --- | --- | --- | --- |
| `ev_41168b7c13e78c8…` | `https://www.duolingo.com/` (target `54503C0F…`) | CDP browser target list, Chrome 157 | 2026-11-12 |

## Findings

| # | Claim | Type | Evidence | Notes / limitations |
| --- | --- | --- | --- | --- |
| 1 | Reference app is a React SPA served from `www.duolingo.com` | observed | `ev_41168b7c13e78c8…` | Page title + URL only; 8 non-page targets excluded from discovery |

## Open questions

- [ ] Lesson loop: what are the exercise types (multiple choice, type-in, match, listen, speak)?
- [ ] Progress bar / hearts / XP accounting — what is awarded when?
- [ ] Streak: what breaks it, what preserves it, what is the freeze/thaw rule?
- [ ] League: how ranking and promotion work, and the time window?
- [ ] SRS: how does it pick what to drill, and how does difficulty adapt?
- [ ] What is the onboarding flow, and what does it ask the learner to choose?

## Method notes

- REA route for this target: **live web app** → CDP browser observation
  (`list_browser_targets` → `capture_browser_scenario` / `inspect_web_page`).
- Chrome must run with `--remote-debugging-port=9222` and a dedicated `--user-data-dir`
  (Chrome 136+ refuses remote debugging on the default profile).
- Profile used: `%LOCALAPPDATA%\Temp\opencode\rea-duolingo-profile` — holds session
  cookies, stays out of git.
- REA never exposes credential header values or storage values; the exposed API surface is
  the one we capture deliberately.
