import { Screen } from '@mobilewright/test';

export class LoginPage {
  readonly screen: Screen;

  constructor(screen: Screen) {
    this.screen = screen;
  }

  // Define locators as private methods
  private getUsernameInput() {
    return this.screen
      .getByLabel('LOGIN_INPUT_USERNAME\nUsername')
      .getByRole('textfield');
  }

  private getPasswordInput() {
    return this.screen
      .getByLabel('LOGIN_INPUT_PASSWORD\nPassword')
      .getByRole('textfield');
  }

  private getSubmitButton() {
    return this.screen.getByRole('button', { name: 'Submit' }).first();
  }

  // Encapsulate the login action
  async login(username: string, password: string) {
    await this.getUsernameInput().fill(username);
    await this.getPasswordInput().fill(password);
    await this.getSubmitButton().tap();
  }
}
