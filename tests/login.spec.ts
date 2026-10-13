import { test } from '@fixtures';
import { StandardUser } from '@data/users';

test.describe('Login Tests', () => {
  // This spec exercises the login flow itself, so skip the automatic login precondition.
  test.use({ loggedIn: false });

  test('should leave the Login screen when logging in with valid credentials', async ({ loginPage }) => {
    // Act: Log in with a valid account
    await loginPage.login(StandardUser.username, StandardUser.password);

    // Assert: The Login screen is closed (destination screen not verified yet)
    await loginPage.verifyLoginScreenClosed();
  });
});
