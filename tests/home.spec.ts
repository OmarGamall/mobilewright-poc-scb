import { test } from '@fixtures';
import { PHASE3_FORM } from '@data/home.data';

test.describe('Home Tests', () => {

  test('should keep the entered username and terms state when filling the Phase 3 form', async ({ homePage }) => {
    // Act: Fill the Phase 3 form and accept the terms
    await homePage.inputUsername(PHASE3_FORM.username);
    await homePage.selectCountry(PHASE3_FORM.country);
    await homePage.selectDate(PHASE3_FORM.date);
    await homePage.setTermsCheckboxState(true);

    // Assert: The entered values stuck
    await homePage.verifyUsername(PHASE3_FORM.username);
    await homePage.verifyTermsChecked(true);
  });

  test('should open the Profile screen when tapping the Profile tab', async ({ homePage, profilePage }) => {
    // Arrange: Start on the Phase 3 home screen
    await homePage.verifyOnPhase3Screen();

    // Act: Navigate to the Profile tab via the bottom nav bar
    await homePage.navigateTo('Profile');

    // Assert: The Profile screen is shown
    await profilePage.verifyOnProfileScreen();
  });

});
