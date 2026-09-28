import type { Screen } from '@mobilewright/core';

/**
 * @fileoverview Page Object Model for the Login screen.
 * Handles user authentication, password masking toggle, and input validations.
 */
export class LoginPage {
  readonly screen: Screen;

  constructor(screen: Screen) {
    this.screen = screen;
  }

  // ============================================================================
  // LOCATORS (private factory methods)
  // ============================================================================

  private getUsernameInput() {
    return this.screen
      .getByLabel('LOGIN_INPUT_USERNAME')
      .getByRole('textfield');
  }

  private getPasswordInput() {
    return this.screen
      .getByLabel('LOGIN_INPUT_PASSWORD')
      .getByRole('textfield');
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
   * Masks the password field if it is currently unmasked.
   */
  async maskPassword(): Promise<void> {
    const isMasked = await this.isPasswordMasked();
    if (!isMasked) {
      await this.getPasswordVisibilityToggle().tap();
    }
  }

  /**
   * Unmasks the password field if it is currently masked.
   */
  async unmaskPassword(): Promise<void> {
    const isMasked = await this.isPasswordMasked();
    if (isMasked) {
      await this.getPasswordVisibilityToggle().tap();
    }
  }

  /**
   * Encapsulates the standard login action.
   * Fills credentials, optionally unmasks password, verifies text inputs, and submits.
   * @param username - The username to enter.
   * @param password - The password to enter.
   */
  async login(username: string, password: string): Promise<void> {
    await this.getUsernameInput().fill(username);
    await this.getPasswordInput().fill(password);
    
    // Optionally unmask the password before submitting, to verify it on UI
    await this.unmaskPassword();
    
    // Assert that the username and password are correct
    await this.verifyUsernameText(username);
    await this.verifyPasswordText(password);

    // Tap the submit button
    await this.getSubmitButton().tap();
  }

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  /**
   * Verifies if the password field is currently masked (displays bullets).
   * @returns {Promise<boolean>} True if the field is masked.
   */
  async isPasswordMasked(): Promise<boolean> {
    // A masked password field will have bullets (•) in its accessible name.
    const maskedField = this.screen
      .getByLabel('LOGIN_INPUT_PASSWORD')
      .getByRole('textfield', { name: /•/ });
      
    return await maskedField.isVisible();
  }

  /**
   * Verifies that the username field contains the expected text.
   * @param expectedUsername - The exact username string expected in the field.
   */
  async verifyUsernameText(expectedUsername: string): Promise<void> {
    const field = this.screen
      .getByLabel('LOGIN_INPUT_USERNAME')
      .getByRole('textfield', { name: expectedUsername });
    await field.waitFor({ state: 'visible' });
  }

  /**
   * Verifies that the password field contains the expected text.
   * Note: Password field must be unmasked for this to match the literal string.
   * @param expectedPassword - The exact password string expected in the field.
   */
  async verifyPasswordText(expectedPassword: string): Promise<void> {
    const field = this.screen
      .getByLabel('LOGIN_INPUT_PASSWORD')
      .getByRole('textfield', { name: expectedPassword });
    await field.waitFor({ state: 'visible' });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
}
