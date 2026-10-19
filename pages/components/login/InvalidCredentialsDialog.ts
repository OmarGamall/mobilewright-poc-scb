import type { Screen } from '@mobilewright/core';
import { expect } from '@mobilewright/test';

/**
 * @fileoverview InvalidCredentialsDialog Component Object.
 * The "Sorry!" bottom sheet shown over the Login screen after a login with
 * invalid credentials (or a locked account). The app gives it no test ids,
 * semantic keys or container node: every locator matches English copy and
 * breaks if the app runs in Arabic. "Sorry!" is not used as the anchor: the
 * title is generic, so other error sheets likely share it.
 * Evidence: .ui-evidence/login-invaild-credentials-locators.yml
 *   - "Invalid credentials or locked account. Reset password to regain access." [View]
 *   - "Reset"  [Button]
 *   - "Cancel" [Button]
 */
export class InvalidCredentialsDialog {
  constructor(private readonly screen: Screen) {}

  // ============================================================================
  // LOCATORS (private factory methods)
  // ============================================================================

  private getMessage() {
    return this.screen.getByLabel(
      'Invalid credentials or locked account. Reset password to regain access.',
    );
  }

  private getResetButton() {
    return this.screen.getByRole('button', { name: 'Reset' });
  }

  /** Unique in the capture: the Login screen behind the sheet has no Cancel button. */
  private getCancelButton() {
    return this.screen.getByRole('button', { name: 'Cancel' });
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Starts the password reset ("Reset"). The app then leaves the Login screen;
   * the caller verifies the destination through that screen's POM.
   */
  async reset(): Promise<void> {
    await this.getResetButton().tap();
  }

  /**
   * Closes the dialog ("Cancel") and waits for it to disappear, so the caller's
   * next tap can't land on the closing sheet.
   */
  async cancel(): Promise<void> {
    await this.getCancelButton().tap();
    await this.getMessage().waitFor({ state: 'hidden' });
  }

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  /** Verifies that the dialog is shown. */
  async verifyShown(): Promise<void> {
    await expect(this.getMessage()).toBeVisible();
  }
}
