/**
 * @fileoverview Central fixture aggregator.
 *
 * Merges all domain-specific fixture files into a single `test` object.
 * All spec files must import `test` and `expect` from here.
 *
 * Usage in spec files:
 *   import { test, expect } from '@fixtures';
 *
 * How to add a new fixture file:
 *   1. Create your domain fixture file (e.g. fixtures/settings.fixture.ts).
 *   2. Import its `test` export here with a descriptive alias.
 *   3. Add it to the mergeTests(...) call below.
 *   4. Update the fixture inventory table in this comment.
 *
 * Fixture inventory:
 * | Fixture Name   | Kind              | Source File        |
 * |----------------|-------------------|--------------------|
 * | loginPage      | Page Object       | pages.fixture.ts   |
 * | homePage       | Page Object       | pages.fixture.ts   |
 * | profilePage    | Page Object       | pages.fixture.ts   |
 * | loggedIn       | Option (true)     | auth.fixture.ts    |
 * | authenticate   | Auto precondition | auth.fixture.ts    |
 */
import { mergeTests } from '@playwright/test';
import { test as pagesTest } from './pages.fixture';
import { test as authTest } from './auth.fixture';

// authTest already extends pagesTest; the merge is the extension point for new
// fixture files (and check-conventions requires every *.fixture.ts imported here).
export const test = mergeTests(pagesTest, authTest);

export { expect } from '@mobilewright/test';
