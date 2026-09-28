---
name: mobilewright-pom-builder
description: >-
  Guides the creation and modification of Mobilewright TypeScript Page Object Model (POM) classes
  following this project's established patterns, best practices, and coding standards.
  Use this skill when the user asks to create, scaffold, or build a new page object, or when
  editing, updating, modifying, or refactoring an existing page object, page class, component
  object, or POM for a mobile screen or UI component.
---

# Mobilewright POM Builder — Complete Guide

> **PREREQUISITE: WHEN TO GATHER EVIDENCE**
> If you need to write **new** locators or fix **broken** locators (due to UI changes), and you
> do not have UI tree evidence, you must first activate the `mobilewright-ui-tree-extractor` skill
> to capture the live screen state. Do not attempt to guess or hallucinate locators.
>
> **EXCEPTIONS (Do NOT run the extractor if):**
> 1. You are composing **new action or assertion methods** using *already existing* locators.
> 2. You are refactoring logic, method signatures, or POM structure.
> 3. The user explicitly provides the new locator strategy in the prompt.

You are building a **Page Object Model (POM)** class for a Mobilewright TypeScript automation
framework targeting a Flutter Android app. Follow every rule in this guide. When in doubt, open an
existing POM in `pages/` and match its conventions exactly.

---

## 1. File Location & Naming

| Type | Path | Example |
|---|---|---|
| Full-screen POM | `pages/<ScreenName>.ts` | `pages/LoginPage.ts` |
| Reusable UI component | `components/<Component>.ts` | `components/DatePicker.ts` |

- One POM per screen or logically distinct component — no "god objects" covering multiple screens.
- Filename must be **PascalCase** and match the class name: `LoginPage.ts` → `LoginPage`.

---

## 2. Class Skeleton

Every POM follows this exact structure. Do not deviate.

```typescript
import type { Screen } from '@mobilewright/core';
// Import only the models/types this POM actually needs
import { type SomeModel } from '../models/SomeModel';

/**
 * @fileoverview Page Object Model for the <Screen Name> screen.
 * <One-line description of what this screen does.>
 */
export class SomePageName {
  readonly screen: Screen;

  constructor(screen: Screen) {
    this.screen = screen;
  }

  // ============================================================================
  // LOCATORS (private factory methods)
  // ============================================================================

  // --- Section: Header ---
  private getSomeButton() {
    return this.screen.getByRole('button', { name: 'SOME_BTN_KEY' });
  }

  // --- Section: Form Fields ---
  private getUsernameInput() {
    return this.screen
      .getByLabel('SOME_INPUT_USERNAME')
      .getByRole('textfield');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  // ... semantic action methods ...

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  // ... verification methods ...

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  // ... private helpers ...
}
```

### Key structural rules

- `readonly screen: Screen` — always public and readonly.
- **All locators are `private` factory methods** — never `private readonly` class fields.
  Mobile UI trees are dynamic; factory methods ensure a fresh locator on every call.
- Locators grouped by **UI section** with comment headers inside the LOCATORS block.
- Use `// ====` separator comments to divide the class into **Locators**, **Actions**,
  **Verify Methods**, and **Private Helpers** sections.

---

## 3. Locator Strategy

### Priority order (Mobile / Flutter)

Mobilewright does not support `getByPlaceholder` or `getByTestId`.
Prefer the **most semantically meaningful locator the UI tree actually supports**:

`getByLabel  >  getByRole  >  getByText`

### Chaining (the mobile pattern)

Flutter widgets are often nested. Scope a child locator by chaining from a labelled container:

```typescript
// A textfield inside a labelled container widget
private getUsernameInput() {
  return this.screen
    .getByLabel('LOGIN_INPUT_USERNAME')
    .getByRole('textfield');
}
```

### Never invent (No Hallucinations)

**Never fabricate a label key, accessible name, or role string that isn't confirmed by a UI tree
dump.** If the evidence doesn't support a locator, use the `mobilewright-ui-tree-extractor` skill
to capture it — do not guess.

### Rules

- **Never** duplicate a locator across files. Each locator belongs to exactly one POM/Component.
- **Never** expose raw locators to spec files. Expose semantic methods instead.
- **No** `.first()`, `.nth()`, `.last()` merely to suppress ambiguity. Fix the locator to be
  specific instead.

---

## 4. Dynamic Locators

For repeating UI elements (lists, dynamic options), write a **private helper** that generates
the locator on the fly:

```typescript
/**
 * Returns a dynamic locator for a country option by its display name.
 * @param country - The visible name of the country button.
 */
private getCountryOption(country: string) {
  return this.screen.getByRole('button', { name: country });
}
```

---

## 5. Semantic Action Methods

Every public method must represent a **user-meaningful action**, not a raw interaction.
Methods are named as verbs describing what the user does.

### Mobile interaction verbs

| Action | API |
|---|---|
| Tap a button | `locator.tap()` |
| Fill a text field | `locator.fill(value)` |
| Wait for visibility | `locator.waitFor({ state: 'visible' })` |

**Never use `.click()` — use `.tap()` for all mobile interactions.**

### ✅ Correct — semantic

```typescript
/**
 * Fills the username field on the login screen.
 * @param username - The username to enter.
 */
async inputUsername(username: string): Promise<void> {
  await this.getUsernameInput().fill(username);
}

/**
 * Selects a country from the dropdown.
 * @param country - The country to select.
 */
async selectCountry(country: 'Egypt' | 'India'): Promise<void> {
  await this.getCountryDropdown().tap();
  await this.getCountryOption(country).tap();
}
```

### ❌ Wrong — exposing raw locators

```typescript
// DON'T do this — forces spec files to call screen.* indirectly
get usernameInput() {
  return this.screen.getByLabel('LOGIN_INPUT_USERNAME').getByRole('textfield');
}
```

### Method signatures

- Every public method must have an **explicit return type** (`Promise<void>`, `Promise<string>`).
- Every `async` operation **must** be `await`ed — no fire-and-forget promises.
- JSDoc with `@param` tags on every public method.

---

## 6. No Network Synchronization

Mobilewright does **not** support HTTP interception. There is no `waitForResponse`,
`waitForURL`, or `Promise.all` network pattern.

When an action triggers a background operation (e.g., a form submit that calls an API),
synchronize by waiting for the resulting **UI change** instead:

```typescript
// ✅ Wait for the outcome to appear in the UI
async submitAndVerifySuccess(): Promise<void> {
  await this.getSubmitButton().tap();
  await this.getSuccessBanner().waitFor({ state: 'visible' });
}
```

---

## 7. Verification Methods

Verification methods use `waitFor({ state: 'visible' })` and live in the `VERIFY METHODS` section.

### Rules

- Prefix with `verify` (e.g., `verifyOnHomeScreen`, `verifyUsernameDisplayed`).
- Wait for the UI element that proves the state, don't just check a text string.

```typescript
/**
 * Verifies the user has landed on the Phase 3 home screen.
 */
async verifyOnPhase3Screen(): Promise<void> {
  await this.getPhase3Label().waitFor({ state: 'visible' });
}
```

---

## 8. Components vs. Page Objects

| Type | Location | When to use |
|---|---|---|
| **Page Object** | `pages/` | One per app screen |
| **Component** | `components/` | Reusable Flutter widget wrappers (DatePicker, Checkbox, BottomSheet) |

A Component wraps a complex, reusable Flutter widget. It takes a scoped `Screen` locator
or the full `screen` and exposes a clean API:

```typescript
// Usage in a Page Object:
async selectDate(date: PickerDate): Promise<void> {
  await this.getDatePickerButton().tap();
  await new DatePicker(this.screen).pick(date);
}
```

---

## 9. Waiting Strategy — What NOT To Do

| ❌ Banned | ✅ Replacement |
|---|---|
| `setTimeout` as a primary wait | `locator.waitFor({ state: 'visible' })` |
| `screen.waitForTimeout(ms)` | `locator.waitFor({ state: 'visible' })` |
| Empty `try/catch` around actions | Fix the root cause, don't swallow errors |
| `waitForResponse` / `waitForURL` | Not available — wait for UI state instead |
| `.click()` | `.tap()` — always use tap for mobile |

`setTimeout` **is only acceptable** inside Component classes as a short settle delay when the
mobile UI has no observable ready-signal (e.g., a scroll animation with no completion event).
It must be accompanied by a comment explaining why no better signal was available.

---

## 10. TypeScript & JSDoc Standards

For general TypeScript formatting (no `any`, explicit return types, type imports) and JSDoc
requirements (`@param`), **follow the global project standards defined in `AGENTS.md`**.

---

## 11. Fixture Registration

After creating a new POM, register it in the appropriate fixture file:

```typescript
// fixtures/authFixture.ts

type AuthFixtures = {
  myNewPage: MyNewPage;
};

export const test = base.extend<AuthFixtures>({
  myNewPage: async ({ loggedInScreen }, use) => {
    await use(new MyNewPage(loggedInScreen));
  },
});
```

Then in spec files:

```typescript
import { test } from '../fixtures/authFixture';

test('should do something', async ({ myNewPage }) => {
  await myNewPage.someAction();
});
```

---

## 12. Agent Boundaries & Scope Control

**Allowed modifications for a POM task:**
- The target POM/Component file (new or existing)
- The fixture file required for registration
- Importing required models

**DO NOT modify without separate approval:**
- Other POMs or Components
- Existing spec/test files
- `mobilewright.config.ts`
- `package.json`

---

## 13. Completion Gate — Verify Before Presenting

Before presenting any POM as complete, check every category below in order.

### A. Structure & Placement
- [ ] File is in `pages/` (screen) or `components/` (reusable widget wrapper)
- [ ] Class name matches filename (PascalCase)
- [ ] `@fileoverview` JSDoc block present
- [ ] `readonly screen: Screen` is declared public

### B. Locators — Evidence, Not Invention
- [ ] Every locator is backed by real UI tree evidence — none were guessed
- [ ] Each locator follows the priority order (`getByLabel > getByRole > getByText`)
- [ ] All locators are **private factory methods**, not class fields
- [ ] No locator is duplicated from another POM/Component file

### C. Actions & Encapsulation
- [ ] No raw locator is exposed publicly
- [ ] All mobile interactions use `.tap()` — no `.click()`
- [ ] No generic wrapper was created (`tapElement`, `safeInput`, etc.)
- [ ] Every `async` operation is `await`ed

### D. Synchronization
- [ ] No `waitForResponse`, `waitForURL`, or `Promise.all` network patterns
- [ ] Explicit waits use `locator.waitFor({ state: 'visible' })`
- [ ] Any `setTimeout` has a documented reason why no better signal exists

### E. Verification Methods
- [ ] Verification methods are prefixed `verify` and use `waitFor`

### F. TypeScript & Docs
- [ ] No `any` anywhere in the file
- [ ] Every public method has an explicit return type
- [ ] Every public method has JSDoc with `@param` tags
- [ ] Type-only imports use the `type` keyword

### G. Scope & Fixture Registration
- [ ] Only files within this task's approved scope were touched
- [ ] New POM is registered in the relevant fixture file (or flagged as needed)

### Final Statement
End with one line: **"Verified against all 7 categories above; N item(s) flagged for your input: [list, or 'none']."**
