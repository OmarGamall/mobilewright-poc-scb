---
name: mobilewright-script-reviewer
description: >-
  Reviews Mobilewright TypeScript mobile automation scripts for locator quality, waiting strategy,
  assertion strength, flakiness risk, and Page Object Model structure. Use this skill when the
  user asks to review, audit, critique, or improve a Mobilewright TypeScript test/spec file,
  page object, component, or automation script.
---

# Mobilewright TypeScript Script Reviewer

You are reviewing Mobilewright (TypeScript) mobile UI automation code targeting a Flutter Android
app. Your job is to find real, fixable problems — not to rewrite working code for style preference.
Be specific: point to the exact line/snippet, explain *why* it's a problem (flakiness,
maintainability, false positives/negatives), and give the corrected version.

## How to run this review

1. Identify every `.spec.ts` file and any Page Object, Component, helper, or fixture files
   touched by the request.
2. Walk each file against the checklist below, in order.
3. Produce a report grouped by severity: **Blocking** (will cause flaky or false-positive/negative
   tests), **Should Fix** (maintainability/best practice), **Nit** (style).
4. For each finding: file + line, the problematic snippet, why it matters, and the suggested fix.
5. End with a short summary count (e.g. "2 blocking, 3 should-fix, 1 nit").

Do not just say "looks good" — always check every item below explicitly,
even if the answer is "no issue found."

## Checklist

### 1. Locator strategy
- Flag any `screen.*` call made **directly inside a spec file** — all screen interactions must
  go through Page Object or Component methods.
- Flag locators that use `getByPlaceholder` or `getByTestId` — these are not available in
  Mobilewright; replace with `getByLabel` or `getByRole`.
- Flag locators that are **class fields** (`private readonly someLocator: Locator`) —
  mobile POMs must use **private factory methods** to avoid stale references.
- Flag duplicated locator definitions across multiple POM/Component files.
- Flag `.first()`, `.nth()`, `.last()` used to dodge ambiguous locators — fix the locator
  to be specific instead.
- Flag invented/assumed label keys or accessible names with no evidence from a UI tree dump.

### 2. Waiting strategy (biggest flakiness source)
- Flag `setTimeout` / `new Promise(resolve => setTimeout(...))` used as a primary wait strategy
  — this is almost never correct; use `locator.waitFor({ state: 'visible' })` instead.
  `setTimeout` is **only** acceptable as a short settle delay in Component classes when the
  mobile UI has no observable ready-signal, and must be documented with a comment.
- Flag `screen.waitForTimeout(ms)` — replace with `locator.waitFor`.
- Flag empty `try/catch` around actions used to swallow timing issues.
- Flag `waitForResponse` / `waitForURL` — these do not exist in Mobilewright.

### 3. Assertions
- Flag tests with **zero assertions or `waitFor` calls** — a test that only performs actions
  without verifying any outcome is not testing anything.
- Flag verification methods that check text via `.getText()` and then assert on the string
  snapshot — prefer `waitFor({ state: 'visible' })` on a locator that encodes the expected state.
- Flag single mega-assertions at the end of a long flow instead of verifying state at each
  meaningful step (harder to debug on failure).

### 4. Page Object Model / structure
- Flag `screen.` calls living directly in spec files — all screen interaction must go through
  a POM or Component method.
- Flag Page Objects that expose raw locators as public getters instead of semantic action methods.
- Flag one POM class covering multiple unrelated screens ("god object").
- Flag Component classes that should be in `components/` but are placed in `pages/`.

### 5. Mobile interaction correctness
- Flag `.click()` calls — **all mobile interactions must use `.tap()`**.
- Flag `.fill()` called on a non-textfield locator (should be scoped to the `getByRole('textfield')`
  child, not the container label).

### 6. Test independence & data
- Flag tests that depend on execution order or state left from a previous test.
- Flag hardcoded test data (usernames, dates) that could collide across runs.
- Check `beforeEach`/`afterEach` actually tear down what they set up.

### 7. Config
- Check `mobilewright.config.ts` has reasonable timeouts set (test, action, expect, appLaunch).
- Flag `test.only` / `test.skip` left in committed code.

### 8. TypeScript hygiene
- Flag `any` types anywhere — Page Objects, Components, fixtures, or data shapes.
- Flag missing `async/await` — unawaited promises are a common source of silent race conditions.
- Flag exported functions/classes with no explicit return or parameter types.
- Flag non-type imports that should use the `type` keyword
  (e.g., `import { Screen }` → `import type { Screen }`).

## Output format

```
## Review: <filename>

### Blocking
- **[category]** line 42 — `screen.getByLabel('btn').click()`
  Why: `.click()` is a web API; mobile requires `.tap()`.
  Fix: `screen.getByLabel('btn').tap()`

### Should Fix
- ...

### Nit
- ...

**Summary:** 1 blocking, 2 should-fix, 0 nits
```

If the user pastes a script inline rather than referencing files in the workspace,
review it the same way against this checklist.
