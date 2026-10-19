---
name: mobilewright-spec-writer
description: >-
  Repo rules for Mobilewright specs (tests/**/*.spec.ts): layout, test design,
  test data, assertions, cleanup, done criteria. Use whenever a task writes,
  extends, refactors or reviews a test: a new test or spec, DDT scenario rows
  in data/, negative/validation tests, a test's data, tags, or test.fail() for
  a known bug, even if "spec" is never said. Also use with
  mobilewright-testcase-automator when automating a manual test case, and with
  mobilewright-script-reviewer when reviewing a spec. Not for POM methods,
  locators, waits, fixtures, config or bug reports.
---

# Mobilewright Spec Writer

A spec is the readable contract of one behavior; all mechanics (locators,
waits, keyboard handling, per-field checks) live in Page Objects, components
and fixtures. `npm run verify` already blocks `screen.*` / `device.*` in specs,
wrong imports, `.only`/`.skip`, hard waits and assertion-less tests
(`docs/static-analysis.md` §2.4); it does **not** catch weak assertions,
guessed data or several behaviors in one test. Those are on you.

## 0. Inventory first (search, don't assume)

- **Layout:** read a neighbouring spec in `tests/` and match it. Reference:
  `tests/login.spec.ts`.
- **Fixtures:** inventory table in `fixtures/index.ts`. Every test starts
  **logged in** on the Home screen (auto fixture `authenticate`); a spec that
  needs the login screen opts out with `test.use({ loggedIn: false })`.
- **POM methods:** `grep -rn "async <verb>" pages/`, then read the
  signature: params, return value, and whether it already verifies.
- **Data:** `data/` (accounts in `data/users.ts`, feature data in
  `data/<feature>.data.ts`); types in `models/` or exported by the component
  (`import type { PickerDate } from '@components/DatePicker'`).

A missing action or `verify…` method is a **gap: stop**. Never work around it
in the spec; it goes in the plan for `mobilewright-pom-builder` (AGENTS.md §2).
A missing fixture is also a gap: name it in the plan and ask.

## 1. Structure and design

- Path `tests/<feature>.spec.ts`; extend an existing spec before creating a
  near-duplicate. `test.describe('<Feature> Tests')`, nested describes per group.
- `// Arrange`, `// Act`, `// Assert` comments in every test, each with a short
  phrase (`// Act: Log in with a valid account`). A test with nothing to arrange
  starts at `// Act`.
- **One behavior per test.** Title `should <outcome> [when <condition>]`,
  unique (DDT titles interpolate `scenario.desc`).
- **Independent:** runs alone, in any order, on any target; setup via
  fixtures or `beforeEach`.
- **Setup cost is test cost:** the app is relaunched before every test and
  setup runs through the UI on one device, so each precondition costs seconds.
  Reuse fixtures, keep `beforeEach` short, report slow setup; never raise
  timeouts.
- **No control flow in the body** (`if`, `try`, ternaries, platform checks).
  Put variation in the data row; different steps or assertions mean different
  tests. Platform differences belong in Page Objects.
- POM methods already report as `@step`s; never wrap a single POM call in
  `test.step`. Use it only to group several calls into a separately-reported
  checkpoint, each ending in a `verify…`. Tags and annotations only when given;
  never invent IDs.
- Keyboard: Page Object methods that type close the keyboard themselves
  (`dismissKeyboard`); specs never handle it.

## 2. Test data

| Value is… | Source |
|---|---|
| A login account | `data/users.ts` (dummy accounts only: the report prints typed text, passwords included) |
| Fixed input for a feature | typed constant in `data/<feature>.data.ts` (`<FEATURE>_DATA`) |
| A variant under test | typed scenario array in `data/<feature>.data.ts`, looped **outside** `test()` (see `.agents/skills/mobilewright-testcase-automator/references/ddt-patterns.md`) |
| Must be unique per run (anything the app stores and could collide) | generated per run (AGENTS.md §5). No generator exists yet: put one in the plan, don't inline `Date.now()` in the spec |
| Expected messages, labels, computed values | existing constant, or evidence: the manual case or the user. Never what a capture happened to show |
| Created by the app and needed later | returned by a POM method, passed on |

- **Never guess** an error message, dialog text or computed value. Ask; a
  guessed expectation fails, or worse, passes for the wrong reason.
- No literals for test data inside specs; name them in `data/`.
- Expected values are written out, not computed with the app's formula, so
  they stay an independent oracle.

## 3. Assertions

- **The last statement asserts the behavior** (value kept, screen reached,
  error shown), not that an action ran.
- Assert through POM `verify…` methods (they hold the auto-waiting `expect`).
  `expect(value)` only on data a POM method returned.
- Prefer the strongest check: the resulting state (`verifyOnHomeScreen(user.displayName)`) over
  "the screen is still open".
- **Every input the test sets is checked** when it is the behavior under test.
  If no `verify…` method exists for it, that is a gap (§0), not something to
  skip silently.
- **Known app bug:** keep the correct assertion; ask, then usually
  `test.fail()` with a comment linking the bug report. Never bend the
  assertion.

## 4. Cleanup

The app is relaunched before every test, so screens and dialogs need no
closing at the end. App data the test changes that survives a relaunch
(settings, stored records) is restored in a fixture after `use()` or in
`afterEach`, never as statements after the assertions (a failed assertion
skips them). Never change device settings from a test (AGENTS.md §3).

## 5. Done (on top of AGENTS.md §7–8)

- New or changed tests: run the spec twice in a row, e.g.
  `npm test -- tests/<feature>.spec.ts --grep "<title>"` (Mobilewright's CLI has
  no `--repeat-each`); pass-then-fail means an order or data collision. The
  phone must be unlocked.
- A failure is your mistake (fix it) or a real mismatch (report it); never
  edit the expectation to go green.
- **Self-check:** ends in an outcome assertion · nothing guessed · no inline
  data · unique `should …` titles · Arrange/Act/Assert · nothing after the
  assertions.
- Report also lists the POM methods the spec relies on, plus any gaps or slow
  setups.
