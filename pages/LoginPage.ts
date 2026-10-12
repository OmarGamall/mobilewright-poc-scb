import type { Screen } from '@mobilewright/core';
import { expect } from '@mobilewright/test';
import { dismissKeyboard } from '../helpers/keyboard';
import { step } from '../utils/step';

/**
 * @fileoverview Page Object Model for the Login screen.
 * Handles user authentication, password masking toggle, and input validations.
 */
export class LoginPage {
  constructor(private readonly screen: Screen) {}

  // ============================================================================
  // LOCATORS (private factory methods)
  // ============================================================================

  /**
   * @param value - Optional text the field must contain; Flutter exposes a textfield's
   *   text as its accessible name.
   */
  private getUsernameInput(value?: string) {
    return this.screen
      .getByLabel('LOGIN_INPUT_USERNAME')
      .getByRole('textfield', value === undefined ? undefined : { name: value });
  }

  /**
   * @param value - Optional text (or pattern) the field must contain. A masked
   *   field's accessible name is bullets (•).
   */
  private getPasswordInput(value?: string | RegExp) {
    return this.screen
      .getByLabel('LOGIN_INPUT_PASSWORD')
      .getByRole('textfield', value === undefined ? undefined : { name: value });
  }

  private getPasswordVisibilityToggle() {
    return this.screen.getByLabel('Clear field button');
  }

  private getForgotPasswordButton() {
    return this.screen.getByRole('button', { name: 'LOGIN_LINK_FORGOT_PASSWORD' });
  }

  private getSubmitButton() {
    return this.screen.getByRole('button', { name: 'LOGIN_BTN_SUBMIT' });
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Encapsulates the standard login action.
   * Fills credentials, optionally unmasks password, verifies text inputs, and submits.
   * @param username - The username to enter.
   * @param password - The password to enter.
   */
  @step('Login as "{0}"') // password is never interpolated
  async login(username: string, password: string): Promise<void> {
    await this.getUsernameInput().fill(username);
    await this.getPasswordInput().fill(password);

    // Optionally unmask the password before submitting, to verify it on UI
    await this.unmaskPassword();

    // Assert that the username and password are correct
    await this.verifyUsernameText(username);
    await this.verifyPasswordText(password);

    // Close the keyboard so it can't cover the submit button
    await dismissKeyboard(this.screen);

    // Tap the submit button
    await this.getSubmitButton().tap();
  }

  /**
   * Masks the password field if it is currently unmasked.
   */
  @step('Mask password')
  async maskPassword(): Promise<void> {
    const isMasked = await this.isPasswordMasked();
    if (!isMasked) {
      await this.getPasswordVisibilityToggle().tap();
    }
  }

  /**
   * Unmasks the password field if it is currently masked.
   */
  @step('Unmask password')
  async unmaskPassword(): Promise<void> {
    const isMasked = await this.isPasswordMasked();
    if (isMasked) {
      await this.getPasswordVisibilityToggle().tap();
    }
  }

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  /**
   * Returns whether the password field is currently masked (displays bullets).
   * @returns {Promise<boolean>} True if the field is masked.
   */
  async isPasswordMasked(): Promise<boolean> {
    return await this.getPasswordInput(/•/).isVisible();
  }

  /**
   * Verifies that the username field contains the expected text.
   * @param expectedUsername - The exact username string expected in the field.
   */
  @step('Verify username is "{0}"')
  async verifyUsernameText(expectedUsername: string): Promise<void> {
    await expect(this.getUsernameInput(expectedUsername)).toBeVisible();
  }

  /**
   * Verifies that the password field contains the expected text.
   * Note: Password field must be unmasked for this to match the literal string.
   * @param expectedPassword - The exact password string expected in the field.
   */
  @step('Verify password text') // the password must never appear in the report
  async verifyPasswordText(expectedPassword: string): Promise<void> {
    await expect(this.getPasswordInput(expectedPassword)).toBeVisible();
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
}
