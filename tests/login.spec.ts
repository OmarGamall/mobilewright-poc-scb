import { test } from '@fixtures';
import { StandardUser } from '@data/users';

// This spec exercises the login flow itself, so skip the automatic login precondition.
test.use({ loggedIn: false });

test('launch app and perform login', async ({ loginPage, homePage }) => {
  await loginPage.login(StandardUser.username, StandardUser.password);

  // Verify transition to Home page (Phase 3 screen)
  await homePage.verifyOnPhase3Screen();
});
