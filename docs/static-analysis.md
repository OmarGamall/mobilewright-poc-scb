# Static Analysis — `npm run verify`

`npm run verify` checks the framework's code **without a device**. It catches type
errors, un-awaited mobile actions, test-runner anti-patterns and breaks in the Page
Object Model before they turn into flaky or false-passing tests on a real phone.

Run it before every commit and pull request. A pass prints nothing beyond the
ESLint summary and exits `0`. If it fails, find the message below: every rule has
a **why** and a **do instead**.

---

## Tools & plugins

There is **no Mobilewright ESLint plugin**. We don't need one:

- Mobilewright's `test` **is** Playwright's test runner (`@mobilewright/test` wraps
  `@playwright/test`), and its `expect` uses the same matcher names
  (`toBeVisible`, `toHaveText`, …). So `eslint-plugin-playwright`'s *test-runner*
  rules (`test.only`, missing assertions, un-awaited `expect`) apply unchanged.
  Its web-only rules (`page.*`, `networkidle`) never match mobile code.
- The mobile- and POM-specific rules are our own `no-restricted-syntax` selectors
  in `eslint.config.mjs`, plus `scripts/check-conventions.mjs` for file structure.

| Package | Role | Applies to |
|---|---|---|
| `typescript` | The `tsc` type checker (Stage 1); also powers type-aware lint rules | All `**/*.ts` |
| `eslint` | The lint engine (Stage 2); runs our `no-restricted-syntax` rules | All `**/*.ts` |
| `@eslint/js` | ESLint's built-in `recommended` rules | All `**/*.ts` |
| `typescript-eslint` | Parses TypeScript; type-aware rules (`any`, promises, assertions) | All `**/*.ts` |
| `eslint-plugin-playwright` | Test-runner rules (focused/skipped tests, assertions, awaits) | `tests/`, `pages/` (incl. `pages/components/`), `fixtures/` |
| `eslint-plugin-jsdoc` | JSDoc + `@param` on public POM/Component methods | `pages/` (incl. `pages/components/`) |
| `@eslint-community/eslint-plugin-eslint-comments` | Rules for `eslint-disable` comments | All `**/*.ts` |

All are **project-local `devDependencies`, pinned to exact versions** in
[`package.json`](../package.json). Don't install ESLint or TypeScript globally; a
different version can give different results. Requires **Node 22.13+**.

> **Why TypeScript 6, not 7?** `typescript-eslint` supports TypeScript `< 6.1`
> only. Without it we would lose the type-aware rules, including
> `no-floating-promises`, the single most valuable check for mobile tests.
> Upgrade TypeScript only when `typescript-eslint` supports the new version.

**Editor feedback (optional):** the VS Code **ESLint** extension
(`dbaeumer.vscode-eslint`) reads `eslint.config.mjs` and underlines violations as
you type.

---

## How it runs

```text
npm run verify
  └─ tsc --noEmit                              1. Types      (tsconfig.json)
       && eslint .                             2. Lint rules (eslint.config.mjs)
       && node scripts/check-conventions.mjs   3. Structure  (scripts/check-conventions.mjs)
```

The stages are chained with `&&`: **the first failing stage stops the run**, so
after fixing one stage, rerun to see the next. ESLint **warnings** are printed but
don't fail the run; errors do.

| Run one stage only | Command |
|---|---|
| Types | `npx tsc --noEmit` |
| Lint the whole repo | `npx eslint .` |
| Lint one file | `npx eslint pages/HomePage.ts` |
| Auto-fix what ESLint can | `npx eslint . --fix` |
| Structure | `node scripts/check-conventions.mjs` |

---

## Stage 1 — TypeScript (`tsc --noEmit`)

Type-checks every `**/*.ts` file. Nothing is emitted.

| Option | What it catches |
|---|---|
| `strict` | Implicit `any`, possible `null`/`undefined` access, wrongly-typed arguments |
| `forceConsistentCasingInFileNames` | `import './loginPage'` when the file is `LoginPage.ts` (works on Windows, breaks on Linux/macOS CI) |
| `paths` | That `@fixtures`, `@fixtures/*`, `@pages/*`, `@components/*` (→ `pages/components/`), `@models/*`, `@helpers/*`, `@data/*`, `@utils/*` resolve |

---

## Stage 2 — ESLint (`eslint .`)

Config: [`eslint.config.mjs`](../eslint.config.mjs). Rules are layered by folder;
later layers add to earlier ones. Generated folders (`node_modules`,
`mobilewright-report`, `test-results`, `.ui-evidence`, `bug-reports`) are ignored.

### 2.1 All TypeScript files

Baseline: `eslint:recommended` + `typescript-eslint` recommended, plus:

| Rule | Fails on | Why |
|---|---|---|
| `@typescript-eslint/no-floating-promises` | `homePage.openQuickAction('Transfer')` without `await` | The test moves on before the tap happens: the classic flaky mobile test, or a false pass if the missing `await` is on an assertion |
| `@typescript-eslint/no-misused-promises` | An `async` function passed where a sync callback is expected | The promise is silently dropped, same effect as above |
| `@typescript-eslint/await-thenable` | `await` on something that isn't a promise | Usually means you called the wrong method |
| `@typescript-eslint/require-await` | An `async` function that never awaits | Either an `await` is missing, or `async` is misleading |
| `@typescript-eslint/no-explicit-any` | `: any` anywhere | Hides typos in locator options and fixture shapes |
| `@typescript-eslint/consistent-type-imports` | `import { Screen }` when `Screen` is only a type | Use `import type`; keeps runtime imports honest (`mobilewright-pom-builder` skill §2) |
| `@typescript-eslint/explicit-module-boundary-types` | An exported function or public method without a return type | Every public POM method declares its return type, e.g. `Promise<void>` (`mobilewright-pom-builder` skill §2) |
| `@typescript-eslint/no-unnecessary-type-assertion` | `x as T` / `x!` when `x` is already `T` | A stale cast hides real type changes in Mobilewright upgrades |
| `@typescript-eslint/switch-exhaustiveness-check` | A `switch` over a union (e.g. `NavTab`) missing a member | Adding a new tab must not silently fall through |
| `no-empty` | `catch {}` | Swallowed errors make a failing step look like a pass |
| `preserve-caught-error` | `catch (e) { throw new Error('…') }` without `{ cause: e }` | Keeps the original Mobilewright error (timeout, locator) in the report |
| `no-restricted-syntax` — fixed sleeps | `setTimeout(…)`, `sleep(…)`, `waitForTimeout(…)` | Sleeps are too short on slow devices and waste time on fast ones. Wait for a UI state: `locator.waitFor({ state: 'visible' })` or `expect(…)`. Exception: see [§ When a rule must be broken](#when-a-rule-must-be-broken) |
| `@typescript-eslint/no-restricted-imports` — `@playwright/test` | `import … from '@playwright/test'` | Use `@mobilewright/test`. Only `fixtures/index.ts` may import `@playwright/test` (for `mergeTests`) |
| `@typescript-eslint/no-restricted-imports` — fixture files | `import { test } from '../fixtures/auth.fixture'` | Import from `@fixtures` so every test gets every fixture |
| `eslint-comments/require-description` | `eslint-disable` without `-- reason` | Every exception must explain itself |
| `eslint-comments/no-unlimited-disable` | A bare `// eslint-disable` | Name the one rule you are disabling |
| `eslint-comments/no-unused-disable` | A disable comment that suppresses nothing | Delete it |

### 2.2 `tests/`, `pages/`, `fixtures/` — test-runner rules

Baseline: `eslint-plugin-playwright` recommended, with these as **errors**:

| Rule | Fails on | Do instead |
|---|---|---|
| `missing-playwright-await` | `expect(locator).toBeVisible()` without `await` | `await expect(…)` — otherwise the assertion never runs |
| `expect-expect` | A test with no assertion | End the test with `expect(…)` or a POM `verify…()` method (both count). Actions with no assertion are not tests (`mobilewright-spec-writer` skill §3) |
| `no-focused-test` | `test.only` | Remove before committing — it silently skips every other test |
| `no-skipped-test` | `test.skip`, `test.fixme` | Remove, or fix the test |
| `no-nth-methods` | `.first()`, `.last()`, `.nth()` | A specific label/role locator backed by `.ui-evidence`; or disable with a reason (see below) |
| `no-force-option` | `{ force: true }` | Fix the real cause (keyboard covering the element, overlay) |
| `no-wait-for-timeout` | `waitForTimeout(…)` | Wait for a UI state |

Warnings from the recommended set (e.g. `no-conditional-in-test`) are shown but
don't fail the run.

### 2.3 `pages/` (incl. `pages/components/`) — locator discipline + JSDoc

Mobile UI trees are rebuilt on every frame, so a locator stored once goes stale.
Locators are **private factory methods** that build a fresh locator on each call.

| Check | Fails on | Do instead |
|---|---|---|
| No locator fields | `private btn = this.screen.getByRole(…)` or `readonly btn: Locator` | `private getBtn() { return this.screen.getByRole(…); }` |
| No locators stored in the constructor | `this.btn = this.screen.getByLabel(…)` | A private factory method |
| Locator factories are private | `getTab() { return this.screen.getByRole(…); }` (public) | Make it `private`; expose `navigateTo(tab)` / `verifyTabVisible(tab)` |
| No public method returns `Locator` | `getRow(): Locator` | Expose a semantic action or verify method |
| No public getters | `get title()` | A semantic method |
| JSDoc on public methods | A public method without `/** … */`, or without a `@param` per parameter | Document it; `@param` names must match the signature |

Private helpers and module-level functions don't need JSDoc.

### 2.4 `tests/` — specs talk to fixtures only

| Check | Fails on | Do instead |
|---|---|---|
| No `screen.*` / `device.*` | `await screen.getByLabel('X').tap()` | Call a Page Object method |
| No reaching into a POM | `homePage.screen.swipe('up')` | Add a method to the Page Object |
| No `screen` / `device` fixture | `async ({ screen }) => …` | Ask for Page Object fixtures: `async ({ loginPage, homePage }) => …` |
| No `new …Page()` | `new LoginPage(screen)` | Use the fixture from `@fixtures` |
| `test` / `expect` from `@fixtures` | `import { test } from '@mobilewright/test'` | `import { test, expect } from '@fixtures'` |
| No POM / helper / util imports | `import { LoginPage } from '../pages/LoginPage'` | Use the fixture. **Type-only** imports are allowed: `import type { PickerDate } from '@components/DatePicker'` |

### 2.5 Documented exemptions

| Path | Relaxed | Why |
|---|---|---|
| `fixtures/index.ts` | May import `@playwright/test` | Needs `mergeTests`, which `@mobilewright/test` doesn't re-export |

Specs that must start logged out don't need an exemption: use
`test.use({ loggedIn: false })` (see `tests/login.spec.ts`).

---

## Stage 3 — Conventions script

[`scripts/check-conventions.mjs`](../scripts/check-conventions.mjs) checks file and
folder structure that ESLint can't see. It lists every violation, then exits `1`.

| # | Check | Example failure |
|---|---|---|
| 1 | `pages/**` files (except `pages/components/`) are PascalCase, end in `Page`, export exactly one class named after the file | `pages/Login.ts: Page Object file names end in "Page" (e.g. LoginPage.ts)` |
| 2 | `pages/components/**` files are PascalCase and export exactly one class named after the file | `pages/components/DatePicker.ts: class Picker does not match file name (expected DatePicker)` |
| 3 | Every `fixtures/*.fixture.ts` is registered in `fixtures/index.ts` | `fixtures/settings.fixture.ts: not registered in fixtures/index.ts` |
| 4 | No top-level folder outside the AGENTS.md layout | `reports/: top-level folder not in the allowlist in scripts/check-conventions.mjs` |
| 5 | Files under `tests/` are `*.spec.ts` or `*.setup.ts` | `tests/utils.ts: files under tests/ must be *.spec.ts or *.setup.ts` |
| 6 | No `CLAUDE.md` / `.claude/CLAUDE.md` / `CLAUDE.local.md`; `AGENTS.md` ≤ 12,000 characters | `CLAUDE.md: remove it; AGENTS.md is the single instruction file …` |
| 7 | Every `.agents/skills/<name>/SKILL.md` has a `.claude/skills/<name>/SKILL.md` pointer with identical frontmatter, and no pointer is orphaned | `.claude/skills/x/SKILL.md: frontmatter differs from .agents/skills/x/SKILL.md; copy it verbatim` |

**Why (6–7):** contributors use different AI tools. Claude Code, Cursor, Codex and
Antigravity all read `AGENTS.md`, but Claude Code reads it only when no `CLAUDE.md`
exists, and Antigravity caps a rules file at 12,000 characters. Codex, Cursor and
Antigravity discover skills in `.agents/skills/`; Claude Code only in
`.claude/skills/`, hence the pointers. Discovery matches on the frontmatter
`description`, so the two copies must stay identical. (Cursor also reads
`.claude/skills/`, so it lists each skill twice; harmless.)

**Why:** one class per file named after the file lets anyone (and any agent) find a
screen's Page Object without searching. An unregistered fixture file is invisible to
every spec. Checks 4 and 5 look only at files git tracks or would track, so ignored
output (`test-results/`, `.ui-evidence/`, …) never trips them. To add a new top-level
folder, add it to `TOP_LEVEL_DIRS` in the same change.

---

## When a rule must be broken

Fix the root cause first (for a bad locator, capture evidence with the
`mobilewright-ui-tree-extractor` skill). If the rule really doesn't fit, disable it
**for one line, by name, with a reason**:

```ts
// ✅ Named rule + reason
// eslint-disable-next-line no-restricted-syntax -- Flutter emits no scroll-end signal; wait for the fling to settle
await new Promise((resolve) => setTimeout(resolve, SCROLL_SETTLE_MS));

// ❌ No reason        → eslint-comments/require-description
// eslint-disable-next-line no-restricted-syntax

// ❌ No rule name     → eslint-comments/no-unlimited-disable
// eslint-disable-next-line
```

A fixed settle delay is acceptable **only inside `pages/components/`**, when the UI has no
observable ready-signal (`mobilewright-pom-builder` skill §5); the disable reason is that
documentation. A disable comment that stops matching anything after a refactor is
itself an error (`no-unused-disable`); delete it.

---

## Adding a new check

| The check is about… | Put it in | Notes |
|---|---|---|
| Types or compiler behaviour | `tsconfig.json` | Protected file |
| Code patterns inside a file | `eslint.config.mjs` (a plugin rule, or a `no-restricted-syntax` selector) | Protected file; scope it to the right folder layer and end the message with `See docs/static-analysis.md.` |
| File names, folders, cross-file registration | `scripts/check-conventions.mjs` | Push a message to `errors`; keep it silent on success |

Whichever you pick, run `npm run verify` against the current code first. A new
check must start at zero violations (or ship with their fixes), and it needs a
row in this document.
