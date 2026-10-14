import { test } from '@fixtures';
import { StandardUser } from '@data/users';

test.describe('Login Tests', () => {
  // This spec exercises the login flow itself, so skip the automatic login precondition.
  test.use({ loggedIn: false });

  test('should land on the Home screen when logging in with valid credentials', async ({ loginPage, homePage }) => {
    // Act: Log in with a valid account
    await loginPage.login(StandardUser.username, StandardUser.password);

    // Assert: The Login screen is closed and the biometric popup is offered
    await homePage.verifyBiometricPopupShown();

    // Act: Decline biometric login
    await homePage.declineBiometric();

    // Assert: Home greets the logged-in user
    await homePage.verifyOnHomeScreen(StandardUser.displayName);
  });
});
