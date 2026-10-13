import { test } from '@fixtures';
import { StandardUser } from '@data/users';

test.describe('Login Tests', () => {
  // This spec exercises the login flow itself, so skip the automatic login precondition.
  test.use({ loggedIn: false });

  test('should land on the Phase 3 screen when logging in with valid credentials', async ({ loginPage, homePage }) => {
    // Act: Log in with a valid account
    await loginPage.login(StandardUser.username, StandardUser.password);

    // Assert: The Phase 3 home screen is shown
    await homePage.verifyOnPhase3Screen();
  });
});
