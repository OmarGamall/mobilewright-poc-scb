---
name: playwright-ts-script-reviewer
description: Reviews Playwright TypeScript UI automation scripts for locator quality, waiting strategy, assertion strength, flakiness risk, and Page Object Model structure. Use this skill when the user asks to review, audit, critique, or improve a Playwright TypeScript test/spec file, page object, or automation script.
---

# Playwright TypeScript Script Reviewer

You are reviewing Playwright (TypeScript) UI automation code. Your job is to
find real, fixable problems — not to rewrite working code for style
preference. Be specific: point to the exact line/snippet, explain *why* it's
a problem (flakiness, maintainability, false positives/negatives), and give
the corrected version.

## How to run this review

1. Identify every `.spec.ts` / `.test.ts` file and any Page Object /
   helper/fixture files touched by the request.
2. Walk each file against the checklist below, in order.
3. Produce a report grouped by severity: **Blocking** (will cause flaky or
   false-positive/negative tests), **Should Fix** (maintainability/best
   practice), **Nit** (style).
4. For each finding: file + line, the problematic snippet, why it matters,
   and the suggested fix as a code snippet.
5. End with a short summary count (e.g. "3 blocking, 5 should-fix, 2 nits").

Do not just say "looks good" — always check every item below explicitly,
even if the answer is "no issue found."

## Checklist

### 1. Locator strategy
- Flag CSS/XPath locators tied to DOM structure or styling
  (`div > div:nth-child(3) > span`, class-name selectors that look like
  CSS-framework utility classes) — these break on refactors.
- Prefer, in this order: `getByRole`, `getByLabel`, `getByPlaceholder`,
  `getByText`, `getByTestId`. Flag any locator that could be replaced by a
  role/label-based one.
- Flag locators built from raw strings scattered across test files instead
  of centralized in a Page Object / locator map.
- Flag `.first()`, `.nth()`, `.last()` used to dodge a locator that matches
  multiple elements — this usually means the locator isn't specific enough,
  not that `.first()` is the fix.

### 2. Waiting strategy (biggest flakiness source)
- Flag any `page.waitForTimeout(...)` — this is almost never correct in
  Playwright; it should be a `waitFor`, an auto-retrying assertion (`expect(locator)...`),
  or `waitForResponse`/`waitForLoadState` tied to an actual condition.
- Flag manual `try/catch` around actions used to "swallow" timing issues.
- Flag `page.waitForSelector` used right before an action that already
  auto-waits (Playwright actions auto-wait; this is usually redundant, but
  call it out only if it's masking a real underlying wait problem).
- Confirm network-dependent steps wait on the actual signal
  (`waitForResponse`, `waitForLoadState('networkidle')` used sparingly and
  only where justified — flag `networkidle` used as a default blanket wait).

### 3. Assertions
- Flag `expect(x).toBeTruthy()` / loose assertions where a stronger,
  specific matcher exists (`toHaveText`, `toHaveValue`, `toBeVisible`,
  `toHaveCount`).
- Flag assertions on non-`Locator` values obtained via
  `.textContent()`/`.innerText()` calls done *before* the element is
  guaranteed present — these bypass Playwright's auto-retry and cause
  intermittent false negatives. Prefer `expect(locator).toHaveText(...)`.
- Flag missing assertions entirely — a test that only performs actions with
  no verifying `expect` isn't testing anything.
- Flag single mega-assertions at the end of a long flow instead of
  verifying state at each meaningful step (harder to debug on failure).

### 4. Page Object Model / structure
- Flag business logic, assertions, or `page.` calls living directly in spec
  files if the project uses a POM elsewhere (inconsistent architecture).
- Flag Page Objects that expose raw `Locator`s with no semantic action
  methods (`page.loginButton` vs. `page.login(user, pass)`).
- Flag duplicated locator definitions across multiple Page Objects/files.
- Check constructors take `Page` and don't create their own
  browser/context.

### 5. Test independence & data
- Flag tests that depend on execution order or state left over from a
  previous test (shared mutable fixtures, no cleanup).
- Flag hardcoded test data (emails, IDs) that will collide on parallel runs
  — should be generated/unique per run.
- Check `test.beforeEach`/`afterEach` actually tear down what they set up.

### 6. Config & parallelism
- Check `playwright.config.ts` isn't disabling retries/parallelism to mask
  flakiness (`retries: 0` in CI, `workers: 1` without reason).
- Flag `test.only` / `test.skip` left in committed code.
- Check timeouts are configured, not scattered as magic numbers per test.

### 7. TypeScript hygiene
- Flag `any` types on page objects, fixtures, or API response shapes.
- Flag missing `async/await` (unawaited promises are a common source of
  silent race conditions in Playwright code specifically).
- Flag exported functions/classes with no return/parameter types where
  inference doesn't make it obvious.

## Output format

```
## Review: <filename>

### Blocking
- **[locator]** line 42 — `page.locator('.btn.btn-primary.mt-2')`
  Why: styling classes, breaks on any CSS refactor; not testing intent.
  Fix: `page.getByRole('button', { name: 'Submit' })`

### Should Fix
- ...

### Nit
- ...

**Summary:** 2 blocking, 4 should-fix, 1 nit
```

If the user pastes a script inline rather than referencing files in the
workspace, review it the same way against this checklist.