import { test as base } from '@mobilewright/test';
import type { Screen } from '@mobilewright/core';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';
import { StandardUser } from '../data/users';

type AuthFixtures = {
  loggedInScreen: Screen;
};

export const test = base.extend<AuthFixtures>({
  loggedInScreen: async ({ screen }: { screen: Screen }, use) => {
    await base.step('Login to Phase 3 screen', async () => {
      const loginPage = new LoginPage(screen);
      const homePage = new HomePage(screen);

      await loginPage.login(StandardUser.username, StandardUser.password);
      await homePage.verifyOnPhase3Screen();
    });

    await use(screen);
  },
});
