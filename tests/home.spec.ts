import { test } from '../fixtures/authFixture';
import { HomePage } from '../pages/HomePage';
import { ProfilePage } from '../pages/ProfilePage';
import { dismissKeyboard } from '../helpers/keyboard';

test.describe('Home Page Features', () => {
  
  test.skip('User can complete the entire Phase 3 form successfully', async ({ loggedInScreen }) => {
    const homePage = new HomePage(loggedInScreen);

    // 1. Input username
    await homePage.inputUsername('omar_phase3');

    // 2. Select a country
    await homePage.selectCountry('Egypt');

    // 3. Select a date
    await homePage.selectDate({ year: 2026, month: 9, day: 15 });

    // 4. Interact with terms checkbox
    await homePage.setTermsCheckboxState(true);
  });

  test('User can navigate to Profile tab from Home screen', async ({ loggedInScreen }) => {
    const homePage = new HomePage(loggedInScreen);
    const profilePage = new ProfilePage(loggedInScreen);

    // 1. Verify we are on the Phase 3 home screen
    await homePage.verifyOnPhase3Screen();

    // 2. Navigate to Profile tab via the bottom nav bar
    await homePage.navigateTo('Profile');

    // 3. Verify we actually landed on the Profile screen
    await profilePage.verifyOnProfileScreen();
  });

});

