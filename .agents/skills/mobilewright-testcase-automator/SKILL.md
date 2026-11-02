---
name: mobilewright-testcase-automator
description: >-
  Workflow for turning a manual mobile test case (pasted text, Excel/CSV rows,
  Gherkin Given/When/Then, or a Jira/Xray/Azure DevOps/TestRail export) into an
  automated Mobilewright spec built from existing Page Object actions and
  verify methods, fixtures, typed test data and data-driven (DDT) loops. Use
  this skill whenever the user shares manual steps or expected results and
  wants them automated, scripted, converted, or "written as a test", even if
  they don't say "spec" or "Mobilewright", and before writing any spec from a
  manual case.
---

# Mobilewright Test Case Automator

This skill is the **workflow** from manual case to spec. The rules for the spec
itself live in `mobilewright-spec-writer`; read it before step 6. POM rules
live in `mobilewright-pom-builder`, and locator evidence in
`mobilewright-ui-tree-extractor`; read them only if step 3 finds a gap.

The goal is a spec a reviewer can hold next to the manual case and tick off
line by line: every manual step is accounted for, every expected result is
asserted, and nothing was invented on the way.

## 1. Normalize the input

Manual cases arrive in many shapes. Convert whatever you got into this shape
before thinking about code. **Read `references/input-formats.md`** for how to
map each format (free text, CSV/Excel rows, Gherkin, Jira/Xray/ADO/TestRail).

```
ID:            <TC-123 | none>
Title:         <one line>
Preconditions: <state that must exist before step 1>
Platforms:     <Android / iOS / both | not stated>
Steps:         1. <action>  → Expected: <observable result | none>
               2. ...
Data:          <values named in the case, or a table of variants>
```

Then challenge it, because manual cases are written for humans who fill gaps
with common sense, and a test can't:

- **Vague expected result** ("works correctly", "data is saved", "proper
  message"): ask what exactly is observable (which text, which field value,
  which screen). Never pick one yourself; a guessed assertion passes for the
  wrong reason.
- **Missing expected result** on a step that matters: ask, or treat the step
  as setup if it clearly is.
- **Several behaviours in one case** (fill, then submit, then edit): propose
  splitting into one test per behaviour; keep one test only if the user wants
  the end-to-end flow.
- **Device steps** ("rotate the phone", "put the app in the background", "turn
  off Wi-Fi"): check a POM or Mobilewright method exists for it
  (`node_modules/@mobilewright/core/dist/*.d.ts`). Anything that changes device
  settings needs the user's approval (AGENTS.md §3).
- **Platform-specific steps** ("on iOS, swipe back"): ask which targets the
  case runs on; the spec itself stays free of platform checks.

Ask all open questions in one message, then wait.

## 2. Classify every step

| Manual content | Becomes |
|---|---|
| Precondition / state before the test ("user logged in") | a fixture (the default start state is logged in; logged out is `test.use({ loggedIn: false })`), or `beforeEach` when several tests share a few steps |
| Data the case names ("a valid user") | an entry in `data/` |
| User action ("tap Login", "enter username") | a POM **action** (domain verb) |
| Expected result | a POM **`verify…`** method, or `expect(value)` on data a POM returned |
| Cleanup ("log out", "close the dialog") | usually nothing: the app is relaunched before every test. App data that survives a relaunch → fixture teardown |

UI-level steps ("tap the username field, type X, tap the password field, type
Y, tap Login") usually collapse into one domain action
(`loginPage.login(username, password)`). Map the *intent*, not the taps.

## 3. Build the traceability matrix (search, don't assume)

For each step, find the real fixture / POM method by searching: fixture names
in the `fixtures/index.ts` inventory table; methods in `pages/` and
`pages/components/` (`grep -rn "async <verb>" pages/`); data in `data/`.
Read the method signature before relying on it: parameter types, what it
returns, whether it already verifies.

Present the matrix before writing code:

| # | Manual step / expected | Kind | Maps to | Status |
|---|---|---|---|---|
| P | User is logged out | fixture | `test.use({ loggedIn: false })` | exists |
| 1 | Enter username and password, tap Login | action | `loginPage.login(username, password)` | exists |
| 1E | Phase 3 screen is shown | verify | `homePage.verifyOnPhase3Screen()` | exists |
| 2 | Tap the Profile tab | action | `homePage.navigateTo('Profile')` | exists |
| 2E | Profile screen is shown | verify | `profilePage.verifyOnProfileScreen()` | exists |
| 3E | Selected country is shown | verify | none | **GAP** |

**Gaps:** a missing method or fixture is not a reason to drop the step or
reach for `screen` in the spec. List each gap with the method signature you'd
need and which POM owns it, then go to §5.

## 4. Design the test data

Choose per value. The question is whether the value has to be unique, is a
variant you're testing, or is fixed data:

| Value is… | Use |
|---|---|
| A login account | `data/users.ts` (dummy accounts only) |
| A variant under test (invalid formats, boundaries, each required field) | **DDT**: typed scenario array in `data/<feature>.data.ts` |
| Fixed input for the feature (a username to type, a country, a date) | typed constant in `data/<feature>.data.ts`, with a comment on where it comes from |
| Must be unique per run (anything the app stores) | a per-run generator; none exists yet, so it goes in the plan |
| Created by the app and needed later | returned by a POM read method, passed along as a variable |

Reference values (dropdown options, messages, labels) must come from the
manual case, existing data files or the user, the same evidence rule as for
locators. Never make them up.

**DDT:** use it when the same steps and the same kind of assertion run over
different data. If the variants need different steps or different
assertions, write separate tests. **Read `references/ddt-patterns.md`**
before writing a scenario array.

## 5. Plan (AGENTS.md §2)

A new spec is at least T2. One plan covers everything the matrix and data
design need, in implementation order:

1. Each **GAP POM method**: owner file, signature, locator evidence, wait
   strategy (`mobilewright-pom-builder` says what the plan must state;
   locators without evidence → `mobilewright-ui-tree-extractor`).
2. Each **new fixture** (no fixture skill yet: describe it and ask).
3. The **data file**: path, exported type and names, the scenario list.
4. The **spec**: path (`tests/<feature>.spec.ts`), describe/test titles, which
   fixtures each test uses, and which targets it was run on.
5. Verification: `npm run verify` + the exact
   `npm run test:<target> -- tests/<feature>.spec.ts` command, and whether a
   device is connected.

Include the matrix from §3 in the plan; it's how the user checks the
mapping. Wait for approval.

## 6. Write the spec

Follow `mobilewright-spec-writer` for everything about the spec itself
(layout, Arrange/Act/Assert, `test.step`, data, assertions, cleanup, known bugs
via `test.fail()`, done criteria). On top of that, for a manual case:

- **Every manual expected result maps to at least one assertion.** A step
  with an expected result but no `verify…`/`expect` is a silent drop.
- **`test.step` names follow the manual steps** when you use steps, so the
  report reads like the case.
- **Traceability is optional.** If the manual case has an ID and the user
  wants it kept, add it to the test details:

  ```typescript
  test('should land on the Phase 3 screen when logging in with valid credentials', {
    tag: '@TC-123',
    annotation: { type: 'testcase', description: 'TC-123' },
  }, async ({ loginPage, homePage }) => { … });
  ```

  No ID, or the user doesn't want it: leave the details object out. Never
  invent an ID, and don't hold up the work for one. Priority/suite tags
  (`@smoke`) only when the user or the case states them.
- **Known bug in a manual step** (the app doesn't behave as the case says):
  don't change the assertion to match the bug. Ask; the usual answer is to
  keep the correct assertion and mark it `test.fail()` with a comment that
  links the bug, or to write a `bug-reports/` entry
  (`mobilewright-bug-reporter`).

## 7. Verify and report

1. `npm run verify` passes.
2. Run only the new/changed spec on the target the plan names
   (`npm run test:<target> -- tests/<feature>.spec.ts`). No device connected:
   report it as **not run**. A failure is either a mapping mistake (fix it) or
   a real app/manual-case mismatch (report it with the step number; don't
   "fix" the expectation to make it green).
3. Final report per AGENTS.md §8, plus the **coverage table**: each manual
   step → the test line(s) that cover it, or why it isn't covered (merged
   into a domain action, moved to a fixture, deliberately dropped with the
   user's agreement). Nothing from the manual case disappears silently.
