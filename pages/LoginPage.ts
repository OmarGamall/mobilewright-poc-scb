import type { Screen } from '@mobilewright/core';
import { expect } from '@mobilewright/test';
import { dismissKeyboard } from '@helpers/keyboard';
import { MissingInformationAlert } from '@components/login/MissingInformationAlert';
import { InvalidCredentialsDialog } from '@components/login/InvalidCredentialsDialog';
import { step } from '../utils/step';

/**
 * @fileoverview Page Object Model for the retail-staging Login screen.
 * Labels are "<KEY>\n<visible text>"; the visible text follows the app language
 * (English/Arabic switch), so every locator anchors on the key only.
 * Evidence: .ui-evidence/login-locators.yml
 */
export class LoginPage {
  constructor(private readonly screen: Screen) {}

  // ============================================================================
  // LOCATORS (private factory methods)
  // ============================================================================

  /** Role-less View with a merged label: matched by getByText's label fallback. */
  private getUsernameInput() {
    return this.screen
      .getByText(/^USERNAME input field for username_field\n/)
      .getByRole('textfield');
  }

  /** Role-less View with a merged label: matched by getByText's label fallback. */
  private getPasswordInput() {
    return this.screen
      .getByText(/^PASSWORD input field for password_field\n/)
      .getByRole('textfield');
  }

  private getSubmitButton() {
    return this.screen.getByRole('button', { name: /^SUBMIT button for login\n/ });
  }

  private missingInfoAlert() {
    return new MissingInformationAlert(this.screen);
  }

  private invalidCredentialsDialog() {
    return new InvalidCredentialsDialog(this.screen);
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Fills the credentials and submits. The caller verifies the destination screen.
   * @param username - The username to enter.
   * @param password - The password to enter.
   */
  @step('Login as "{0}"') // password is never interpolated
  async login(username: string, password: string): Promise<void> {
    await this.getUsernameInput().fill(username);
    await this.getPasswordInput().fill(password);

    // The open keyboard covers the submit button
    await dismissKeyboard(this.screen);

    await this.getSubmitButton().tap();
  }

  /**
   * Submits the form without typing anything. No field gets focus, so no
   * keyboard opens over the submit button. Mobilewright cannot fill(''), so
   * login('', '') is not an option.
   */
  @step('Submit login form with empty credentials')
  async submitEmptyCredentials(): Promise<void> {
    await this.getSubmitButton().tap();
  }

  /**
   * Starts the password reset from the "invalid credentials" dialog. The caller
   * verifies the destination screen.
   */
  @step('Reset password from invalid credentials dialog')
  async resetPasswordFromInvalidCredentialsDialog(): Promise<void> {
    await this.invalidCredentialsDialog().reset();
  }

  /** Closes the "invalid credentials" dialog, returning to the Login form. */
  @step('Dismiss invalid credentials dialog')
  async dismissInvalidCredentialsDialog(): Promise<void> {
    await this.invalidCredentialsDialog().cancel();
  }

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  /** Verifies that the Login screen is shown. */
  @step('Verify on Login screen')
  async verifyOnLoginScreen(): Promise<void> {
    await expect(this.getSubmitButton()).toBeVisible();
  }

  /**
   * Verifies that the Login screen has closed (e.g. after a successful login).
   * Call it only after acting on the Login screen, so the absence check can't
   * pass before the screen has rendered.
   */
  @step('Verify Login screen is closed')
  async verifyLoginScreenClosed(): Promise<void> {
    await expect(this.getSubmitButton(), 'Login submit button is gone').toBeHidden();
  }

  /** Verifies the "Missing Information" alert shown after submitting empty credentials. */
  @step('Verify Missing Information alert is shown')
  async verifyMissingInformationAlertShown(): Promise<void> {
    await this.missingInfoAlert().verifyShown();
  }

  /** Verifies the "invalid credentials" dialog shown after a rejected login. */
  @step('Verify invalid credentials dialog is shown')
  async verifyInvalidCredentialsDialogShown(): Promise<void> {
    await this.invalidCredentialsDialog().verifyShown();
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
}
