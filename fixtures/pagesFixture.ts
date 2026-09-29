import { test as base } from './authFixture';
import { HomePage } from '../pages/HomePage';
import { ProfilePage } from '../pages/ProfilePage';

type PagesFixtures = {
  homePage: HomePage;
  profilePage: ProfilePage;
};

export const test = base.extend<PagesFixtures>({
  homePage: async ({ loggedInScreen }, use) => {
    await use(new HomePage(loggedInScreen));
  },
  profilePage: async ({ loggedInScreen }, use) => {
    await use(new ProfilePage(loggedInScreen));
  },
});
