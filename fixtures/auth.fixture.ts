/**
 * @fileoverview Logged-in start state for every test.
 *
 * The auto fixture `authenticate` logs in as `StandardUser` through the Login UI
 * and checks the Phase 3 screen before each test body runs.
 *
 * - Not Playwright `storageState`: there is no saved session to restore. The
 *   `device` fixture relaunches the app for every test and the app has no deep
 *   link or login backdoor, so each test does one full UI login.
 * - Cost: that login runs inside the test's own timeout (`mobilewright.config.ts`).
 * - Assumes a cold start always lands on Login. The relaunch does not clear app
 *   data, so if the app ever persists the session, this login will fail.
 * - A login failure is reported against `authenticate`, before the test body.
 * - Opt out (spec starts on Login) with `test.use({ loggedIn: false })`; the
 *   fixture then only verifies the Login screen is shown.
 */
import { test as base } from './pages.fixture';
import { StandardUser } from '@data/users';

type AuthOptions = {
  /**
   * When true (default), every test starts logged in as `StandardUser` on the
   * Phase 3 screen. Opt out per file/describe with `test.use({ loggedIn: false })`.
   */
  loggedIn: boolean;
};

type AuthFixtures = {
  authenticate: void;
};

export const test = base.extend<AuthOptions & AuthFixtures>({
  loggedIn: [true, { option: true }],

  authenticate: [
    async ({ loggedIn, loginPage, homePage }, use) => {
      if (loggedIn) {
        await base.step('Login to Phase 3 screen', async () => {
          await loginPage.login(StandardUser.username, StandardUser.password);
          await homePage.verifyOnPhase3Screen();
        });
      } else {
        await loginPage.verifyOnLoginScreen();
      }
      await use();
    },
    { auto: true },
  ],
});
