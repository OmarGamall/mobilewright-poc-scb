import type { Screen } from '@mobilewright/core';
import { step } from '../utils/step';
import { dismissKeyboard } from '../helpers/keyboard';

/**
 * @fileoverview Page Object Model for the Login screen.
 * Handles user authentication and navigation to registration or password recovery.
 */
export class LoginPage {
  readonly screen: Screen;

  constructor(screen: Screen) {
    this.screen = screen;
  }

  // ============================================================================
  // LOCATORS (private factory methods)
  // ============================================================================

  private getLanguageToggle() {
    return this.screen.getByLabel('SWITCH_LANGUAGE button for login\nالعربية');
  }

  private getWelcomeTitle() {
    return this.screen.getByLabel('Welcome');
  }

  private getUsernameInput() {
    return this.screen
      .getByLabel('USERNAME input field for username_field\nUsername')
      .getByRole('textfield');
  }

  private getPasswordInput() {
    return this.screen
      .getByLabel('PASSWORD input field for password_field\nPassword')
      .getByRole('textfield');
  }

  private getTogglePasswordVisibilityButton() {
    return this.screen
      .getByLabel('PASSWORD input field for password_field\nPassword')
      .getByLabel('Clear field button');
  }

  private getForgotPasswordLink() {
    return this.screen.getByLabel('FORGOT_PASSWORD link for login\nForgot password?');
  }

  private getSubmitButton() {
    return this.screen.getByRole('button', { name: 'SUBMIT button for login\nLog in' });
  }

  private getRegisterLink() {
    return this.screen.getByLabel('REGISTER button for login\nNew user? Register');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Performs the complete login flow by filling credentials and submitting.
   * @param username - The username to enter.
   * @param password - The password to enter.
   */
  @step('Login with username "{0}"')
  async login(username: string, password: string): Promise<void> {
    await this.getUsernameInput().fill(username);
    await this.getPasswordInput().fill(password);
    await dismissKeyboard(this.screen);
    await this.getSubmitButton().tap();
  }

  /**
   * Switches the application language via the toggle button.
   */
  @step('Switch language')
  async switchLanguage(): Promise<void> {
    await this.getLanguageToggle().tap();
  }

  /**
   * Taps the forgot password link.
   */
  @step('Tap forgot password')
  async tapForgotPassword(): Promise<void> {
    await this.getForgotPasswordLink().tap();
  }

  /**
   * Taps the register link.
   */
  @step('Tap register new user')
  async tapRegister(): Promise<void> {
    await this.getRegisterLink().tap();
  }

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  /**
   * Verifies that the Login screen is currently displayed.
   */
  @step('Verify on Login screen')
  async verifyOnLoginScreen(): Promise<void> {
    await this.getWelcomeTitle().waitFor({ state: 'visible' });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
}
