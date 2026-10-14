import { test, expect } from '@fixtures';
import { StagingUsers } from '@data/users';

// Temporary: captures each staging account's display name (report annotation
// "displayName") so it can be filled into data/users.ts. Greeting not verified yet.
test.describe('Staging Users Tests', () => {
  // Each row logs in itself, so skip the automatic login precondition.
  test.use({ loggedIn: false });

  for (const user of StagingUsers) {
    test(`should log in and show a display name for user ${user.username}`, async ({ loginPage, homePage }) => {
      // Act: Log in with the staging account
      await loginPage.login(user.username, user.password);

      // Assert: The login succeeded and the biometric popup is offered
      await homePage.verifyBiometricPopupShown();

      // Act: Decline biometric login and read the Home greeting name
      await homePage.declineBiometric();
      const displayName = await homePage.getDisplayName();
      test.info().annotations.push({ type: 'displayName', description: `${user.username}: ${displayName}` });

      // Assert: Home shows a name for the user
      expect(displayName, 'Home header shows a display name').toBeTruthy();
    });
  }
});
