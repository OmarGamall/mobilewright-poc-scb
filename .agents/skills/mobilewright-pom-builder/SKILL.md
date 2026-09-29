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

---

## STEP 0 — Identify Task Type (Always Do This First)

Before writing any plan or code, identify which scenario applies and follow the branch:

```
A) Build new POM from scratch         → locators needed → go to STEP 1
B) Refactor POM after a UI change     → fresh locators needed → go to STEP 1
C) Refactor logic/actions/verify only → no locator changes → skip to §2 (write code)
D) User provided the UI tree in chat  → validate inline → skip to §2 (write code)
```

---

## STEP 1 — Evidence Check (Scenarios A & B only)

Before writing any plan or code, check for UI tree evidence:

1. Does `.ui-evidence/<screen>-locators.yml` already exist for this screen?
   - **Yes** → Read it and validate it (see validation rules below).
   - **No** → Activate the `mobilewright-ui-tree-extractor` skill **now**, before writing anything.

2. **Validation rules** (for existing files or user-provided trees):
   - [ ] At least one node with a `label` or `role` is present.
   - [ ] No `com.android.systemui` nodes exist (system UI was filtered).
   - [ ] Any user-entered text on `EditText` nodes shows as `[REDACTED]`.
   - [ ] No obvious PII (email patterns, phone numbers, full names in label values).
   - If any check fails → stop, report the issue, ask how to proceed. Do not guess.

> **Scenario D — User provides tree in chat or as a file:**
> Apply the same 4 validation rules above to the provided content. If it passes, use it as
> your evidence source and proceed to write code. Do not call the extractor unnecessarily.

---

## 1. File Location & Naming

| Type | Path | Example |
|---|---|---|
| Full-screen POM | `pages/<ScreenName>.ts` | `pages/LoginPage.ts` |
| Reusable UI component | `components/<Component>.ts` | `components/DatePicker.ts` |

- One POM per screen or logically distinct component — no "god objects" covering multiple screens.
- Filename must be **PascalCase** and match the class name exactly: `LoginPage.ts` → `LoginPage`.

---

## 2. Class Skeleton

Every POM follows this exact structure. Do not deviate.

```typescript
import type { Screen } from '@mobilewright/core';
import { step } from '../utils/step';
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

  private getSomeButton() {
    return this.screen.getByRole('button', { name: 'SOME_BTN_KEY' });
  }

  private getUsernameInput() {
    return this.screen
      .getByLabel('SOME_INPUT_USERNAME')
      .getByRole('textfield');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  // Tier 1 — Composite actions (full workflow steps — what specs call by default)

  // Tier 2 — Atomic actions (single-step; public only when a focused test needs it)

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
}
```

### Key structural rules

- `readonly screen: Screen` — always public and readonly.
- **All locators are `private` factory methods** — never `private readonly` class fields.
  Mobile UI trees are dynamic; factory methods ensure a fresh locator on every call.
- Use `// ====` separator comments to divide the class into **Locators**, **Actions**,
  **Verify Methods**, and **Private Helpers** sections.

---

## 3. Locator Strategy

### Priority order (Mobile / Flutter)

`getByLabel  >  getByRole  >  getByText`

Mobilewright does not support `getByPlaceholder` or `getByTestId`. Always use the most
semantically meaningful locator the UI tree **actually supports** — never invent one.

### Chaining (the mobile pattern)

Flutter widgets are often nested inside labelled container widgets. Scope a child locator
by chaining from the container's label:

```typescript
private getUsernameInput() {
  return this.screen
    .getByLabel('LOGIN_INPUT_USERNAME')
    .getByRole('textfield');
}
```

### Rules

- Never fabricate a label key, accessible name, or role string not confirmed by UI tree evidence.
- Never duplicate a locator across files — each locator belongs to exactly one POM/Component.
- Never expose raw locators publicly. Expose semantic methods instead.
- No `.first()`, `.nth()`, `.last()` to suppress ambiguity — fix the locator to be specific.

*See §12 Completion Gate, Category B for the full locator checklist.*

---

## 4. Dynamic Locators

For repeating UI elements (lists, options, dynamic rows), write a **private helper method**
that generates the locator on the fly:

```typescript
/**
 * Returns a dynamic locator for a country option by its visible display name.
 * @param country - The exact visible name of the country as shown in the dropdown.
 */
private getCountryOption(country: string) {
  return this.screen.getByRole('button', { name: country });
}
```

> If valid values are domain-constrained, define a type in `models/` and import it.
> Never hardcode a union type like `'Egypt' | 'India'` directly in the POM — that couples
> the POM to app data and must change whenever a new country is added.

---

## 5. Action Methods — Two-Tier Model

Every public method represents a user-meaningful action. Methods are named as verbs.

### Tier 1 — Composite Actions (primary spec interface)

These represent a **complete user workflow step**. Specs call these by default.
Write them **first** in the ACTIONS section.

```typescript
/**
 * Performs the complete login flow: fills credentials, unmasks password,
 * verifies inputs, and submits the form.
 * @param username - The username to enter.
 * @param password - The password to enter.
 */
async login(username: string, password: string): Promise<void> {
  await this.getUsernameInput().fill(username);
  await this.getPasswordInput().fill(password);
  await this.unmaskPassword();
  await this.verifyUsernameText(username);
  await this.verifyPasswordText(password);
  await this.getSubmitButton().tap();
}
```

### Tier 2 — Atomic Actions (focused-test building blocks)

These are **single-step interactions**. Make them `public` **only** when a specific
focused test genuinely needs to call the step in isolation (e.g., testing partial form
state). Otherwise, keep them `private`.

```typescript
/**
 * Fills the username field only. Use login() for the full flow.
 * Exposed for focused tests that verify partial form state.
 * @param username - The username to enter.
 */
async inputUsername(username: string): Promise<void> {
  await this.getUsernameInput().fill(username);
}
```

> **Rule:** Default to `private` for atomics. Promote to `public` only when a real test
> scenario proves it needs to be called independently — never expose "just in case".

> `@step` applies to methods matching the annotation rule in `AGENTS.md` section 4. Locator factories, pure forwarders and loop helpers stay undecorated. Never put a password or token in a step template; use `{ mask: [n] }` only if a sensitive argument has to appear.

### Mobile interaction verbs

| Action | API |
|---|---|
| Tap a button | `locator.tap()` |
| Fill a text field | `locator.fill(value)` |
| Wait for visibility | `locator.waitFor({ state: 'visible' })` |

**Never use `.click()` — always use `.tap()` for all mobile interactions.**

### Method signatures

- Every public method must have an **explicit return type** (`Promise<void>`, `Promise<string>`).
- Every `async` operation **must** be `await`ed — no fire-and-forget.
- JSDoc with `@param` tags on every public method.

*See §12 Completion Gate, Category C & F for the full checklist.*

---

## 6. No Network Synchronization

Mobilewright does **not** support HTTP interception. When an action triggers a background
operation (e.g., form submit calling an API), synchronize by waiting for the resulting
**UI change** instead:

```typescript
async submitAndVerifySuccess(): Promise<void> {
  await this.getSubmitButton().tap();
  await this.getSuccessBanner().waitFor({ state: 'visible' });
}
```

---

## 7. Keyboard Handling (The "Hidden Tap" Trap)

In mobile automation, if a valid `.tap()` executes but the app does not respond, it is almost always because the software keyboard was open and intercepted the tap (especially for bottom navigation bars or submit buttons).

- **Rule:** If an action requires tapping a UI element near the bottom of the screen (like a Nav Bar or Submit button) and a text input was just interacted with (or is auto-focused), you **MUST** explicitly dismiss the keyboard first.
- **How:** Do not duplicate keyboard dismissal logic in POMs. Import and use the global `dismissKeyboard` helper from `helpers/keyboard.ts` directly in the spec file, or inside composite action methods.

```typescript
// Good - using the global helper
import { dismissKeyboard } from '../helpers/keyboard';

await test.step('Navigate to Profile', async () => {
  await dismissKeyboard(loggedInScreen);
  await homePage.navigateTo('Profile');
});
```

---

## 8. Verification Methods

- Prefix with `verify` (e.g., `verifyOnHomeScreen`, `verifyUsernameDisplayed`).
- Always wait for the UI element that proves the state — don't check a text string alone.
- Live in the `VERIFY METHODS` section, after all action methods.

```typescript
@step('Verify on Phase 3 screen')
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

A Component wraps a complex, reusable Flutter widget and exposes a clean API:

```typescript
async selectDate(date: PickerDate): Promise<void> {
  await this.getDatePickerButton().tap();
  await new DatePicker(this.screen).pick(date);
}
```

---

## 9. Waiting Strategy

| ❌ Banned | ✅ Replacement |
|---|---|
| `setTimeout` as a primary wait | `locator.waitFor({ state: 'visible' })` |
| `screen.waitForTimeout(ms)` | `locator.waitFor({ state: 'visible' })` |
| Empty `try/catch` around actions | Fix the root cause — don't swallow errors |
| `waitForResponse` / `waitForURL` | Not available — wait for UI state instead |
| `.click()` | `.tap()` — always |

`setTimeout` **is only acceptable** inside Component classes as a short settle delay when
no observable ready-signal exists (e.g., a scroll animation with no completion event).
It must have a comment explaining why no better signal was available.

*See §12 Completion Gate, Category D for the full checklist.*

---

## 10. TypeScript & JSDoc Standards

Follow the global project standards defined in `AGENTS.md`:
- No `any` anywhere.
- Explicit return types on all public methods.
- `import type` for type-only imports.
- JSDoc `@param` on every public method.

---

## 11. Fixture Registration (Optional — Only When Needed)

Register a new POM in a fixture file **only if** a spec file needs to receive it as an
injected dependency via the test runner. For one-off or utility pages, instantiate directly
in the test using `new MyPage(screen)`. Over-registering clutters the fixture file.

**When registration is needed:**
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

---

## 12. Agent Boundaries & Scope Control

**Allowed for a POM task:**
- The target POM/Component file (new or existing).
- The fixture file, **only if** registration is genuinely needed.
- Importing required models.

**DO NOT modify without separate approval:**
- Other POMs or Components not in scope.
- Existing spec/test files.
- `mobilewright.config.ts` or `package.json`.

---

## 13. Completion Gate — Verify Before Presenting

Before presenting any POM as complete, check every category in order.

### A. Structure & Placement
- [ ] File is in `pages/` (screen) or `components/` (reusable widget wrapper).
- [ ] Class name matches filename (PascalCase).
- [ ] `@fileoverview` JSDoc block is present.
- [ ] `readonly screen: Screen` is declared public.

### B. Locators — Evidence, Not Invention
- [ ] Every locator is backed by real UI tree evidence — none were guessed.
- [ ] Priority order followed: `getByLabel > getByRole > getByText`.
- [ ] All locators are **private factory methods**, not class fields.
- [ ] No locator is duplicated from another POM/Component.

### C. Actions & Encapsulation
- [ ] Every `async` action/verify method that is a recognizable step is decorated with `@step('...')` (rule: `AGENTS.md` section 4).
- [ ] No `@step` on locator factories, constructors, non-async or value-returning methods, loop/retry helpers, or pure forwarders.
- [ ] No action is annotated at two layers (no page method and component method with the same step meaning).
- [ ] No sensitive argument appears in a step template.
- [ ] No raw locator is exposed publicly.
- [ ] All mobile interactions use `.tap()` — no `.click()`.
- [ ] No generic wrappers created (`tapElement`, `safeInput`, etc.).
- [ ] Composite (Tier 1) methods written before atomic (Tier 2) methods.
- [ ] Atomic methods are `private` unless a real focused test needs them `public`.
- [ ] Every `async` operation is `await`ed.

### D. Synchronization
- [ ] No `waitForResponse`, `waitForURL`, or network patterns.
- [ ] Explicit waits use `locator.waitFor({ state: 'visible' })`.
- [ ] Any `setTimeout` has a documented reason why no better signal exists.

### E. Verification Methods
- [ ] All verification methods are prefixed `verify` and use `waitFor`.

### F. TypeScript & Docs
- [ ] No `any` anywhere.
- [ ] Every public method has an explicit return type.
- [ ] Every public method has JSDoc with `@param` tags.
- [ ] Type-only imports use the `type` keyword.

### G. Scope & Fixture Registration
- [ ] Only files within approved scope were touched.
- [ ] Fixture registration added **only if** a spec genuinely requires injection.

### Final Statement
End with exactly one line:
**"Verified against all 7 categories above; N item(s) flagged for your input: [list, or 'none']."**
