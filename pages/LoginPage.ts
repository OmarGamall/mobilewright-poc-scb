import type { Screen } from '@mobilewright/core';
import { expect } from '@mobilewright/test';
import { dismissKeyboard } from '@helpers/keyboard';
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

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
}
