import { test } from '@mobilewright/test';
import { LoginPage } from '../pages/LoginPage';

test('launch app and perform login', async ({ screen }) => {
  const loginPage = new LoginPage(screen);
  
  // Perform the login action using the Page Object
  await loginPage.login('omar', '123');
    
  console.log("Login submitted successfully via POM!");
});
