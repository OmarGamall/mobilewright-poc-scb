import { test as base } from '@mobilewright/test';
import { LoginPage } from '@pages/LoginPage';
import { HomePage } from '@pages/HomePage';
import { ProfilePage } from '@pages/ProfilePage';

type PagesFixtures = {
  loginPage: LoginPage;
  homePage: HomePage;
  profilePage: ProfilePage;
};

/**
 * Page Object fixtures. Each one only wraps the shared `screen`; it performs no
 * navigation or login. App-state preconditions live in `auth.fixture.ts`.
 */
export const test = base.extend<PagesFixtures>({
  loginPage: async ({ screen }, use) => {
    await use(new LoginPage(screen));
  },
  homePage: async ({ screen }, use) => {
    await use(new HomePage(screen));
  },
  profilePage: async ({ screen }, use) => {
    await use(new ProfilePage(screen));
  },
});
