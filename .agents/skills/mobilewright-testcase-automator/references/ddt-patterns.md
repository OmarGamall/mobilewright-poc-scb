# Data-driven test (DDT) patterns

## When to use DDT

Use it when **the steps are the same and the assertion has the same shape**;
only the input and the expected value change. Typical cases: invalid formats,
boundary values, each required field, each tab or list option.

Don't use it when variants need different steps, different POM methods, or an
`if` in the test body to decide what to assert. That's two tests that happen
to look alike. An `if` inside a DDT body hides which path ran and breaks the
"no conditionals around assertions" rule.

On mobile every row is a full test: the app is relaunched and the start state
is rebuilt through the UI on one device. Keep only the rows the case asks for.

## The scenario file

Location: `data/<feature>.data.ts`, next to the existing data files. One
exported array per behaviour.

```typescript
import type { NavTab } from '@components/BottomNavBar';

/** One bottom-nav tab and the screen it must open. */
export type NavTabScenario = {
  /** Unique, human-readable, used in the test title. */
  desc: string;
  tab: NavTab;
};

/** Tabs the Home screen must navigate to. Source: TC-310. */
export const navTabScenarios = [
  { desc: 'the Transfers tab', tab: 'Transfers' },
  { desc: 'the Products tab', tab: 'Products' },
  { desc: 'the More tab', tab: 'More' },
] as const satisfies readonly NavTabScenario[];
```

- **Typed.** Declare the scenario type (or reuse one from `models/` or a
  component's exported type) and use `satisfies` so a typo in a field name
  fails `tsc`.
- **Unique `desc`.** It goes into the test title; duplicate titles make the
  runner fail at collection time, and vague ones ("case 1") make the report
  useless.
- **Expected values live in the row** when they differ per row
  (`expectedError`). When every row expects the same thing, keep that in the
  test, not repeated in every row.
- **Source comment:** where the variants came from (manual case ID, spec
  document, user). Variants are test data and need evidence like any other;
  never take them from whatever a capture happened to show.
- **Nothing that must be unique** goes in the array as a literal. Rows hold
  only the variant; the test generates the rest per run.
- **Known-bug rows**: don't delete or comment them out silently. Keep the row
  and handle it as SKILL.md §6 says (ask; usually `test.fail()` plus a bug
  link), so the gap stays visible.

## The spec side

```typescript
import { test } from '@fixtures';
import { invalidUsernameScenarios } from '@data/login.data';

test.describe('Login Validation', () => {
  test.use({ loggedIn: false });

  for (const scenario of invalidUsernameScenarios) {
    test(`should reject the login when the username is ${scenario.desc}`, async ({ loginPage }) => {
      // Act: Submit the form with the invalid username
      await loginPage.login(scenario.value, scenario.password);

      // Assert: The validation message is shown
      await loginPage.verifyErrorMessage(scenario.expectedError);
    });
  }
});
```

*(Illustrative: `login.data.ts` and `verifyErrorMessage` don't exist yet; a
real spec only uses methods found in §3 of SKILL.md or planned as gaps.)*

- Loop **outside** `test()`, inside a `describe`: one test per row, so each
  row reports, retries and fails on its own. Never loop inside one test body.
  The first failure would hide the rest.
- Negative/validation rows must end in a `verify…` of the validation state
  (field error, message, still on the same screen), not just "no crash".
- Same fixtures for every row; if rows need different fixtures, they are
  different tests.
- Combining dimensions (field × invalid format): build the cross product in
  the data file as an explicit array, only for combinations the manual case
  actually asks for. Don't cross everything with everything; the test count
  and the device time explode.
