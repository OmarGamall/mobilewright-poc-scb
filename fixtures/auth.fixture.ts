import { test as base } from './pages.fixture';
import { StandardUser } from '../data/users';

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
      }
      await use();
    },
    { auto: true },
  ],
});
