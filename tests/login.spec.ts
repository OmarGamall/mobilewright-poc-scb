import { test } from '@fixtures';
import { InvalidUserData, StandardUser } from '@data/users';

test.describe('Login Tests', () => {
  // This spec exercises the login flow itself, so skip the automatic login precondition.
  test.use({ loggedIn: false });

  test('should land on the Home screen when logging in with valid credentials', { tag: '@positive' }, async ({ loginPage, homePage }) => {
    // Act: Log in with a valid account
    await loginPage.login(StandardUser.username, StandardUser.password);

    // Assert: The Login screen is closed and the biometric popup is offered
    await homePage.verifyBiometricPopupShown();

    // Act: Decline biometric login
    await homePage.declineBiometric();

    // Assert: Home greets the logged-in user
    await homePage.verifyOnHomeScreen(StandardUser.displayName);
  });

  test('should show the Missing Information alert when username and password are empty', { tag: '@negative' }, async ({ loginPage }) => {
    // Act: Submit the form without credentials
    await loginPage.submitEmptyCredentials();

    // Assert: The Missing Information alert is shown
    await loginPage.verifyMissingInformationAlertShown();
  });

  for (const credentials of [InvalidUserData.wrongPassword, InvalidUserData.nonExistingUsername]) {
    test(`should show the invalid credentials dialog when logging in with ${credentials.desc}`, { tag: '@negative' }, async ({ loginPage }) => {
      // Act: Log in with rejected credentials
      await loginPage.login(credentials.username, credentials.password);

      // Assert: The invalid credentials dialog is shown
      await loginPage.verifyInvalidCredentialsDialogShown();
    });
  }
});
