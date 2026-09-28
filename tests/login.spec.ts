import { test } from '@mobilewright/test';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';
import { StandardUser } from '../data/users';

test('launch app and perform login', async ({ screen }) => {
  const loginPage = new LoginPage(screen);
  const homePage = new HomePage(screen);

  await loginPage.login(StandardUser.username, StandardUser.password);
  
  // Verify transition to Home page (Phase 3 screen)
  await homePage.verifyOnPhase3Screen();
});
