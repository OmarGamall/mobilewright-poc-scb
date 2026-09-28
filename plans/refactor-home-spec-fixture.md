# Refactor home.spec.ts to use loggedInScreen fixture

## Goal
Update `tests/home.spec.ts` to use the `loggedInScreen` fixture directly and instantiate `HomePage` within the test, since the `homePage` fixture has been removed from `authFixture.ts`.

## Files to modify
- `tests/home.spec.ts`

## Proposed Changes

### 1. `tests/home.spec.ts`

**Change details:**
- Add an import for the `HomePage` POM class.
- Update the test signature to accept the `loggedInScreen` fixture instead of `homePage`.
- Instantiate the `HomePage` object at the beginning of the test.

**Code modifications:**

```diff
 import { test } from '../fixtures/authFixture';
+import { HomePage } from '../pages/HomePage';
 
 test.describe('Home Page Features', () => {
   
-  test('User can complete the entire Phase 3 form successfully', async ({ homePage }) => {
+  test('User can complete the entire Phase 3 form successfully', async ({ loggedInScreen }) => {
+    const homePage = new HomePage(loggedInScreen);
+
     // 1. Input username
     await homePage.inputUsername('omar_phase3');
```

## Verification
- Run typescript compilation (`npx tsc --noEmit`) to verify the file compiles.
- Run `npx mobilewright test tests/home.spec.ts` to ensure the test still passes successfully.
