---
name: playwright-pom-builder
description: >-
  Guides the creation and modification of Playwright TypeScript Page Object Model (POM) classes
  following this project's established patterns, best practices, and coding
  standards. Use this skill when the user asks to create, scaffold, or build a
  new page object, or when editing, updating, modifying, or refactoring an existing 
  page object, page class, component object, or POM for a page or UI component.
---

# Playwright POM Builder — Complete Guide

> **PREREQUISITE: WHEN TO GATHER EVIDENCE**
> If you need to write **new** locators or fix **broken** locators (due to UI changes), and you do not have DOM/A11y evidence, you must first activate the `ai-dom-extractor` skill to capture the page state. Do not attempt to guess or hallucinate locators.
> 
> **EXCEPTIONS (Do NOT run the extractor if):**
> 1. You are composing **new Action, Verify, or Helper methods** using *already existing* locators.
> 2. You are refactoring logic, method signatures, or POM structure.
> 3. The user explicitly provides the new locator strategy in the prompt.

You are building a **Page Object Model (POM)** class for a Playwright TypeScript
automation framework. Follow every rule in this guide. When in doubt, open an
existing POM in `pages/` and match its conventions exactly.

---

## 1. File Location & Naming

| Type | Path | Example |
|---|---|---|
| Full-page POM | `pages/<module>/<page-name>.ts` | `pages/reception/add-patient.ts` |
| Shared component | `pages/components/<component>.ts` | `pages/components/toast.ts` |

- One POM per page or logically distinct component — no "god objects" covering
  multiple screens.
- Filename must be **kebab-case** and match the class name:
  `add-patient.ts` → `AddPatientPage`, `toast.ts` → `ToastComponent`.

---

## 2. Class Skeleton

Every POM follows this exact structure. Do not deviate.

```typescript
import { Page, Locator, expect } from '@playwright/test';
// Import only the models/types this POM actually needs
import { type SomeModel } from '../../models/some-model';

/**
 * @fileoverview Page Object Model for the <Page Name> page.
 * <One-line description of what this page does.>
 */
export class SomePageName {
  readonly page: Page;

  // ── Section: Header Actions ──────────────────────────────────
  private readonly saveBtn: Locator;
  private readonly cancelBtn: Locator;

  // ── Section: Form Fields ─────────────────────────────────────
  private readonly nameInput: Locator;
  private readonly emailInput: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header Actions
    this.saveBtn = page.getByRole('button', { name: 'Save' });
    this.cancelBtn = page.getByRole('button', { name: 'Cancel' });

    // Form Fields
    this.nameInput = page.getByLabel('Name');
    this.emailInput = page.locator('#Email');
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

- `readonly page: Page` — always public and readonly.
- **Static locators** declared as **`private readonly`** class members. **Dynamic locators** must be returned by **`private`** locator factory methods. Never use locators inline in action methods.
- Locators grouped by **UI section** with comment headers.
- All static locator assignments live **only** in the constructor.
- Use `// ====` separator comments to divide the class into **Actions**,
  **Verify Methods**, and **Private Helpers** sections.

---

## 3. Locator Strategy

### Priority order (default — not absolute)

Prefer the **most accessible locator that the DOM evidence actually
supports**, in this order:

`getByRole  >  getByLabel  >  getByPlaceholder  >  getByText  >  getByTestId`

This is a default, not a rule to force at all costs. If the DOM doesn't
support the preferred option (e.g. an icon-only button with no accessible
name, an input with no real associated `<label>`), move down the list to
the next locator that genuinely exists — do not skip past a working
option just to "stay high" on the list.

### Never invent (No Hallucinations)

**Never fabricate an accessible name, label association, test id, or DOM
relationship that isn't actually present.** If none of the above locators
are genuinely supported by the markup, fall back to CSS or XPath as below
— do not invent a `getByLabel`/`getByRole` call that will silently target
the wrong element or fail.

### CSS / XPath (last resort)

- **CSS** is acceptable only when no accessible locator (role, label,
  placeholder, text, test id) works. Prefer CSS over XPath when a fallback
  is unavoidable — it's more resilient to DOM restructuring.
- **XPath** is the absolute last resort, used only when CSS can't express
  the needed relationship (e.g. text-based ancestor traversal).
- Whenever CSS or XPath is used, add a comment stating **why no accessible
  locator was available** — not just "CSS required," but the actual reason.

```typescript
// Example: CSS required because Angular ng-select has no accessible role or label
this.titleSelect = page.locator('ng-select[name="TitleId"]');
```

### Rules

- **Never** duplicate a locator across files. Each locator belongs to exactly
  one POM.
- **Never** expose raw `Locator` objects to spec files. Expose semantic methods
  instead.
- **Do not use `.first()`, `.nth()`, or `.last()` merely to suppress locator ambiguity** (strict mode violations). Fix the locator to be specific instead.
  - *Exception:* They are allowed when position is part of the application's intended behavior (e.g., clicking the "first available" option to configure a default) and the positional intent is documented.
  - *Prefer narrowing by:* parent container (locator chaining), `.filter({ hasText })`, `.filter({ has })`, or semantic relationship before resorting to positional index.

---

## 4. Dynamic Locators

When interacting with **repeating UI elements** (lists, tables, dropdown
options, file attachments), do **not** create dozens of static locators.
Write a **private helper** that generates the locator on the fly:

```typescript
/**
 * Returns a dynamic locator for a specific app tile by its path.
 * @param app - The application definition containing the route path.
 */
private getAppLocator(app: AppType): Locator {
  return this.page.locator(`a[href='${app.path}']`);
}
```

```typescript
/**
 * Returns a dynamic locator for a specific attached file by name.
 * Matches by base filename since the server appends timestamps.
 * @param fileName - The original filename (e.g. 'test-file.png')
 */
private getAttachedFileLocator(fileName: string): Locator {
  const baseName = fileName.split('.')[0];
  return this.page.locator('.attachment-titles .item-name')
    .filter({ hasText: baseName });
}
```

---

## 5. Semantic Action Methods

Every public method must represent a **user-meaningful action**, not a raw
browser interaction. Methods are named as verbs describing what the user does.

### Navigation Ownership

**Never write `page.goto(...)` directly in a spec file.** Navigation is a page-level responsibility.

- **Direct Navigation:** If a test needs to navigate directly to a page via a URL, the corresponding POM must expose a `goto()` method (e.g., `await loginPage.goto()`).
- **Encapsulation:** The URL path must be encapsulated inside the POM's `goto()` method, not passed in from the test.
- **UI Navigation:** If navigating via the UI (e.g., clicking a sidebar link), that action belongs to the POM that contains the link (e.g., `await sidebarMenu.clickPatientsList()`).

### Do not over-engineer (No Generic Wrappers)

Playwright's native API already handles auto-waiting, visibility, and stability checks. **Do not create abstractions solely to reduce line count.**

**Do NOT create:**
- generic `clickElement` or `safeFill` wrappers
- generic locator wrappers
- one-method component classes
- unnecessary base page classes
- abstractions used only once

**Create an abstraction ONLY when it represents:**
- reusable domain behavior (e.g., `selectInsuranceProvider(...)`, not `clickDropdown(...)`)
- a repeated, complex UI structure
- a meaningful architectural boundary

### ✅ Correct — semantic

```typescript
async login(username: string, password: string): Promise<void> {
  await this.usernameInput.fill(username);
  await this.passwordInput.fill(password);
  await this.loginButton.click();
}

async selectInsuranceProvider(providerVal: string): Promise<void> {
  await this.selectFromDropdown(this.insuranceProviderSelect, providerVal);
}
```

### ❌ Wrong — exposing raw locators

```typescript
// DON'T do this — forces spec files to call page.locator() indirectly
get loginButton(): Locator {
  return this.page.getByRole('button', { name: 'Sign In' });
}
```

### Method signatures

- Every public method must have an **explicit return type** (`Promise<void>`,
  `Promise<string>`, etc.).
- Every `async` operation **must** be `await`ed — no fire-and-forget promises.
- JSDoc with `@param` tags on every public method.

---

## 6. Handling Concurrent Events (`Promise.all` Pattern)

> **This is the single most important reliability pattern in this framework.**

When a user action (click, select, upload) triggers a **dependent side effect** — a
critical network request, navigation, or popup — you must use `Promise.all()` to
register the listener and dispatch the action **simultaneously**.

### The Rule for network calls

> **Use `Promise.all([waitFor..., action()])` when the test depends on a specific side effect.** Do not use sequential waits.

*Note: Only synchronize against critical side effects (e.g., saving data, cascade dropdowns) that subsequent steps rely on. Do not wait for background requests like analytics or notifications.*

### Synchronization Hierarchy: UI State vs. API State

> **Rule:** Synchronize with the narrowest reliable signal that represents the required behavior. Prefer user-visible state or locator assertions when sufficient. Use network synchronization when the API response itself is the dependency or when UI state does not provide a reliable synchronization point.

To prevent over-engineering, follow this hierarchy:

1. **Verify Outcomes via UI State (Preferred):** 
   If the business requirement is "clicking Save results in the patient appearing in the table," do not force an API wait in the POM action. Instead, let the action complete and use `expect(patientRow).toBeVisible()` in the test or verification method. Playwright's auto-retrying assertions are the most robust way to handle UI state changes.

2. **Wait for APIs via `Promise.all` (When Necessary):** 
   Only use network synchronization inside POM actions when:
   - The API completion is the actual prerequisite for the next action (e.g., cascade dropdowns where the UI offers no stable intermediate state).
   - The test must guarantee a backend operation (like Save) completes before navigating away, to prevent interrupting the request.
   - You explicitly need to verify the API payload or status code.

### ✅ Correct Pattern

```typescript
// GOOD: listener and action start concurrently — full timeout budget preserved
await Promise.all([
  this.page.waitForResponse(
    r => r.url().includes('/api/save') && r.request().method() === 'POST',
    { timeout: 30000 }
  ),
  this.saveBtn.click(),
]);
```

### When to apply

Use `Promise.all` whenever an action triggers **any** of the following:

| Trigger | Playwright API to pair with |
|---|---|
| Critical network request (save, delete, search) | `page.waitForResponse(...)` |
| Page navigation | `page.waitForURL(...)` |
| New tab / popup window | `page.waitForEvent('popup')` |
| File chooser dialog | `page.waitForEvent('filechooser')` |
| Cascade dropdown (selection triggers API to load next dropdown's data) | `page.waitForResponse(...)` |

### Real examples from this codebase

**Save button → POST API:**
```typescript
async clickSaveButton(expectApiCall: boolean = true): Promise<void> {
  if (expectApiCall) {
    await Promise.all([
      this.page.waitForResponse(
        r => r.url().includes('/patient/insert/') && r.request().method() === 'POST',
        { timeout: 30000 }
      ),
      this.saveBtn.click(),
    ]);
  } else {
    await this.saveBtn.click();
  }
}
```

**Cascade dropdown (selecting a city loads districts):**
// This is a perfect example of a "dependent side effect." We must wait for this API
// before proceeding, or the next dropdown will be empty or wiped by Angular.
```typescript
/**
 * Selects City.
 * MUST wait for the 'getdistrictbycity' API call to finish before proceeding,
 * otherwise the District dropdown options will be wiped out by Angular's async re-render.
 * @param cityVal The city to select.
 */
async selectCity(cityVal: string): Promise<void> {
  await Promise.all([
    this.page.waitForResponse(
      r => r.url().includes('getdistrictbycity') && r.status() === 200,
      { timeout: 30000 }
    ),
    this.selectFromDropdown(this.citySelect, cityVal),
  ]);
}
```

**Confirm delete dialog → DELETE API:**
```typescript
async deletePatient(): Promise<void> {
  await this.actionsBtn.click();
  await this.deletePatientBtn.click();
  await expect(this.confirmDeletePopUp).toBeVisible();

  await Promise.all([
    this.page.waitForResponse(
      r => r.url().includes('/patient/Obsolete/') && r.status() === 200,
      { timeout: 30000 }
    ),
    this.confirmDeleteBtn.click(),
  ]);
}
```

**File upload → upload API:**
```typescript
async addPatientFile(filePaths: string | string[]): Promise<void> {
  await this.navigateToPatientFiles();

  await Promise.all([
    this.page.waitForResponse(
      r => r.url().includes('/patientattachment/insertpatientoldfiles') && r.status() === 200,
      { timeout: 120000 }  // extended for large files
    ),
    this.fileInput.setInputFiles(filePaths),
  ]);
}
```

### Quick mental checklist before writing any POM method

1. **Does the test *depend* on a critical network response from this action (e.g., Save, Cascade Dropdown)?** → `Promise.all` with `waitForResponse`. (Ignore non-blocking background/analytics calls).
2. **Does this action cause a navigation?** → `Promise.all` with `waitForURL`.
3. **Does this action open a new tab or dialog?** → `Promise.all` with `waitForEvent`.
4. **None of the above?** → A plain `await element.click()` is fine.

---

## 7. Verification Methods

Verification methods use Playwright's **auto-retrying assertions**
(`expect(locator)`) and live in the `VERIFY METHODS` section.

### Rules

- Prefix with `verify` (e.g., `verifyPatientData`, `verifyIsOnPage`).
- Always use **locator-based assertions** — never extract text first and then
  assert on the string:

```typescript
// ✅ Auto-retrying — Playwright keeps checking until timeout
async verifyIsOnPage(): Promise<void> {
  await expect(this.page).toHaveURL(/.*\/reception\/patient\/list/);
}

async verifyToast(type: ToastType, title: string, message: string): Promise<void> {
  const toast = this.page.locator('div.ngx-toastr').first();
  await expect(toast).toHaveClass(new RegExp(`toast-${type}`));
  await expect(toast.locator('.toast-title')).toHaveText(title);
  await expect(toast.locator('.toast-message')).toHaveText(message);
}
```

```typescript
// ❌ NOT auto-retrying — bypasses Playwright's retry mechanism
const text = await this.nameInput.textContent();  // snapshot, no retry
expect(text).toBe('John');  // can fail if element hasn't rendered yet
```

- Add a **custom assertion message** for complex checks:

```typescript
await expect(patientRow,
  `Expected patient with code ${code} was not found in search results`
).toBeVisible();
```

---

## 8. Composite Orchestration Methods

For forms with many fields, create a single `fill...AndSave()` method that:

1. Accepts a **partial data object** (every field optional via `Partial<T>` or
   a custom `PartialX` type).
2. Guards each field with `if (field !== undefined)` — so passing `undefined`
   **skips** the field (for negative testing), while passing `''` **clears** it.
3. Calls `clickSaveButton()` at the end.

```typescript
async fillPatientDataAndSave(
  patient: PartialPatient,
  expectApiCall: boolean = true
): Promise<void> {
  // --- Basic Info ---
  if (patient.firstName !== undefined) await this.enterFirstName(patient.firstName)
  if (patient.age       !== undefined) await this.enterAge(String(patient.age))
  if (patient.gender    !== undefined) await this.selectGender(patient.gender)
  if (patient.isVip     !== undefined) await this.setVip(patient.isVip)

  // --- Contact Info ---
  if (patient.residence !== undefined) await this.selectResidence(patient.residence)
  if (patient.city      !== undefined) await this.selectCity(patient.city)
  if (patient.phone     !== undefined) await this.enterPhone(patient.phone)

  // --- Payment & Insurance ---
  if (patient.paymentType === 'Insurance') {
    await this.selectInsuranceOption()
    if (patient.insuranceDetails?.provider !== undefined)
      await this.selectInsuranceProvider(patient.insuranceDetails.provider)
  } else if (patient.paymentType === 'Self Payment') {
    await this.selectSelfPayment()
  }

  await this.clickSaveButton(expectApiCall)
}
```

### The `expectApiCall` parameter pattern

When a form has frontend validation, the API call **never fires** if validation
fails. Waiting for it would cause a timeout. The `expectApiCall` boolean
parameter lets tests control this:

```typescript
// Happy path — waits for the API response
await addPatientPage.fillPatientDataAndSave(patient);

// Negative test — validation blocks the API, so don't wait
await addPatientPage.fillPatientDataAndSave(patient, false);
```

---

## 9. Private Helpers

Shared logic (like selecting from a dropdown) goes in the `PRIVATE HELPERS`
section. These methods are **private** — never called from spec files.

```typescript
/**
 * Selects an option from an ng-select dropdown.
 * @param dropdownLocator - The locator for the ng-select element.
 * @param val - The visible text of the option to select.
 */
private async selectFromDropdown(
  dropdownLocator: Locator,
  val: string
): Promise<void> {
  await dropdownLocator.locator('input').fill(val);

  const optionLocator = this.page
    .locator('ng-dropdown-panel .ng-option')
    .getByText(val, { exact: true });

  await optionLocator.click();
}
```

Other common private helpers:

- **Phone number formatters** for normalizing international formats
- **Dynamic locator factories** (see Section 4)
- **Tab/section navigators** (`navigateToPatientFiles()`)

---

## 10. TypeScript & JSDoc Standards

For general TypeScript formatting (no `any`, explicit return types, type imports) and JSDoc requirements (`@param`), **follow the global project standards defined in `AGENTS.md`**.

*(Note: POM-specific structure rules like `private readonly` locators and `@fileoverview` blocks are covered in Section 2: Class Skeleton).*

---

## 11. Fixture Registration

After creating a new POM, register it in the appropriate fixture file so tests
can receive it as a typed parameter:

```typescript
// fixtures/reception.fixture.ts

type ReceptionFixtures = {
  myNewPage: MyNewPage;   // ← add the type
};

export const test = baseTest.extend<ReceptionFixtures>({
  myNewPage: async ({ receptionPageWithBranchAndFloor }, use) => {
    await use(new MyNewPage(receptionPageWithBranchAndFloor));
  },
});
```

Then in spec files:

```typescript
import { test, expect } from '@fixtures/reception.fixture';

test('should do something', async ({ myNewPage }) => {
  await myNewPage.someAction();
});
```

---

## 12. Waiting Strategy — What NOT To Do

| ❌ Banned | ✅ Replacement |
|---|---|
| `page.waitForTimeout(ms)` | `expect(locator).toBeVisible()` or `waitForResponse` |
| `page.waitForSelector(...)` before an action | Playwright actions auto-wait; remove it |
| Empty `try/catch` around actions | Fix the root cause, don't swallow errors |
| `waitForLoadState('networkidle')` as a blanket wait | Use specific `waitForResponse` for the API you depend on |
| Sequential `waitForResponse` → `click` → `await` | `Promise.all([waitForResponse, click])` (see Section 6) |

---

## 13. Agent Boundaries & Scope Control

### File Scope (Preventing Scope Creep)

When tasked with creating or editing a POM, you must strictly limit your changes to the requested scope. Do not adopt a "Boy Scout" mentality of fixing unrelated code you happen to see.

**Allowed Modifications:**
- The target POM file (new or existing)
- A required shared component file (if extracting repeated POM UI)
- The specific fixture file required for registration
- Importing required types or models

**DO NOT Modify:**
- Unrelated POMs
- Existing spec/test files
- API clients or helpers
- Configuration files (`playwright.config.ts`)
- Global setup or teardown scripts
- The core data models themselves

*...unless explicitly requested by the user.*

### Knowledge Scope (Facts vs. Assumptions)

**Never convert inferred behavior into implementation facts without evidence.**

- **Evidence:** The button has `role=button` and `name="Save"`. *(Fact: We can click it).*
- **Inference:** Clicking "Save" probably submits the form.
- **Assumption:** Clicking "Save" triggers a `POST /patient/insert/` API call.

Do not write a `waitForResponse` for an API endpoint unless you have hard evidence (from an existing file, a provided network log, or explicitly told by the user) that the specific URL and HTTP method are correct. **Do not hallucinate or guess API endpoints.** If you know a side effect must occur but lack the exact API URL, ask the user for the endpoint rather than inventing one.

---

## 14. Completion Gate — Verify Before Presenting

Before presenting any POM as complete, work through every category below
**in order**. For each category, briefly state what you checked and what
you found — a silent checklist of checkmarks with no reasoning is not
acceptable, since it's indistinguishable from not having checked at all.

If any item fails and can be fixed, fix it before presenting the code. If
an item fails and you're not sure how to fix it (e.g., no reliable locator
exists for an element), stop and flag it to the user explicitly — do not
present code you have not actually verified.

### A. Structure & Placement
- [ ] File is in the correct `pages/` subdirectory (page vs. `components/`)
- [ ] Class name matches filename (kebab-case file → PascalCase class)
- [ ] `@fileoverview` JSDoc block present
- [ ] `readonly page: Page` is declared public (per this project's convention)

### B. Locators — Evidence, Not Invention
- [ ] Every locator is backed by real DOM/accessibility evidence you were
      given (snapshot, provided markup, or explicit user statement) —
      **none were inferred or guessed**
- [ ] Each locator either follows the priority order
      (`getByRole > getByLabel > getByPlaceholder > getByText > getByTestId`)
      or has a comment explaining why the DOM didn't support a higher
      option
- [ ] Any CSS/XPath fallback has a comment stating the specific reason no
      accessible locator worked — not a generic "CSS required"
- [ ] No locator was disambiguated with `.first()/.nth()/.last()` unless
      position is genuinely part of the intended behavior (documented)
- [ ] Static locators are `private readonly` class fields; dynamic
      (repeating-element) locators are `private` factory methods — none
      declared inline inside an action method
- [ ] No locator is duplicated from another POM file

### C. Actions & Encapsulation
- [ ] No raw `Locator` is exposed publicly — every interaction is a
      semantic method (`login(...)`, not `get loginButton()`)
- [ ] No `page.goto(...)` appears outside this POM's own `goto()` method
- [ ] No generic wrapper was created (`clickElement`, `safeFill`, etc.) —
      every new method represents real domain behavior, a repeated
      complex structure, or a genuine architectural boundary
- [ ] Every `async` operation is `await`ed

### D. Synchronization
- [ ] For each action with a side effect, the Sync Hierarchy was actually
      applied: UI-state assertion first; `Promise.all` network sync only
      where the API completion is a genuine prerequisite (state which
      case applies for each synchronized action)
- [ ] Any `waitForResponse` predicate's URL/method is backed by evidence
      (existing code, network log, or user confirmation) — **not guessed**
- [ ] No `page.waitForTimeout()`, no pre-action `page.waitForSelector()`,
      no blanket `networkidle` wait, no empty/broad `try/catch` masking
      timing issues

### E. Verification Methods
- [ ] Verification methods are prefixed `verify` and use auto-retrying
      `expect(locator)` — none extract text via `.textContent()` first
      and assert on the string
- [ ] Complex assertions have a custom failure message

### F. TypeScript & Docs
- [ ] No `any` anywhere in the file
- [ ] Every public method has an explicit return type
- [ ] Every public method has JSDoc with `@param` tags
- [ ] Type-only imports use the `type` keyword

### G. Scope & Fixture Registration
- [ ] Only files within this task's approved scope were touched (per
      `AGENTS.md` / Section 13) — no unrelated POM, spec, config, or model
      file was modified
- [ ] New POM is registered in the relevant fixture file; if no fixture
      file exists yet, that's called out as a new file in the plan, not
      created silently

### Final Statement
End with one line: **"Verified against all 7 categories above; N item(s)
flagged for your input: [list, or 'none']."** Never state a POM is ready
without this line.
