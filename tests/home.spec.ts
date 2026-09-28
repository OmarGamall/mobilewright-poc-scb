import { test } from '../fixtures/authFixture';
import { HomePage } from '../pages/HomePage';

test.describe('Home Page Features', () => {
  
  test('User can complete the entire Phase 3 form successfully', async ({ loggedInScreen }) => {
    const homePage = new HomePage(loggedInScreen);

    // 1. Input username
    await homePage.inputUsername('omar_phase3');

    // 2. Select a country
    await homePage.selectCountry('Egypt');

    // 3. Select a date
    await homePage.selectDate({ year: 2026, month: 9, day: 15 });

    // 4. Interact with terms checkbox
    await homePage.setTermsCheckboxState(true);

    // You can add assertions here to verify the final state before moving to Phase 4
  });

});
