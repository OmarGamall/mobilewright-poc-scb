# Plan: Refactor Page Objects and Components

## Goal
Update the existing Page Objects (`HomePage.ts`, `LoginPage.ts`) and Components (`Checkbox.ts`, `DatePicker.ts`) to strictly comply with the newly defined rules in the `mobilewright-pom-builder` skill.

---

## What Needs Fixing (Deviations from SKILL.md)

1. **Class Skeleton & Formatting:**
   - None of the files have the required `/** @fileoverview ... */` JSDoc at the top.
   - The files use `// --- Locators ---` instead of the mandated `// ====` separator block comments.
2. **TypeScript Strictness:**
   - Public methods are missing explicit return types (e.g., `Promise<void>`).
   - `Checkbox.ts` uses `any` for the locator parameter.
   - `DatePicker.ts` uses `any` to bypass missing typings on `Screen` (`swipe`) and `Locator` (`getText`). We will define local types instead of using `any`.
3. **JSDoc Standards:**
   - Public methods lack complete JSDoc blocks with `@param` tags.
4. **Verification Method Naming:**
   - `LoginPage.ts` uses `assertUsernameText` and `assertPasswordText`. The rule mandates prefixing these with `verify` (e.g., `verifyUsernameText`).

---

## Proposed Changes per File

### 1. `pages/HomePage.ts`
- **Add:** `@fileoverview` header.
- **Add:** `// ====` separators for LOCATORS, ACTIONS, VERIFY METHODS.
- **Fix:** Add `Promise<void>` return types to `verifyOnPhase3Screen`, `inputUsername`, `selectCountry`, `setTermsCheckboxState`, `selectDate`.
- **Fix:** Add full JSDoc comments to all public methods.

### 2. `pages/LoginPage.ts`
- **Add:** `@fileoverview` header.
- **Add:** `// ====` separators.
- **Fix:** Rename `assertUsernameText` to `verifyUsernameText` and move to VERIFY METHODS section.
- **Fix:** Rename `assertPasswordText` to `verifyPasswordText` and move to VERIFY METHODS section.
- **Fix:** Add `Promise<boolean>` to `isPasswordMasked`, `Promise<void>` to the rest.
- **Fix:** Add JSDoc comments to all public methods.

### 3. `components/Checkbox.ts`
- **Add:** `@fileoverview` header.
- **Add:** `// ====` separators.
- **Fix:** Remove `any` from `constructor(private readonly locator: any)`. Replace with `type Locator = ReturnType<Screen['getByRole']>;` as done in `DatePicker`.
- **Fix:** Add `Promise<void>` and `Promise<boolean>` explicit return types.
- **Fix:** Add JSDoc comments.

### 4. `components/DatePicker.ts`
- **Add:** `@fileoverview` header.
- **Add:** `// ====` separators.
- **Fix:** Remove `any` usage. 
  - For `(this.screen as any).swipe`, create a local interface `MobileScreen` extending `Screen`.
  - For `(this.header() as any).getText()`, assume `Locator` has it or add a custom type.
- **Fix:** Ensure all public methods have complete JSDoc.

---

## Verification
- Run `npx mobilewright test` after modifications to ensure existing tests (`login.spec.ts`, `home.spec.ts`) still pass perfectly.
- Ensure no TypeScript errors are introduced.
