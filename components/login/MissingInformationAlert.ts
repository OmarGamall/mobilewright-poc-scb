import type { Screen } from '@mobilewright/core';
import { expect } from '@mobilewright/test';

/**
 * @fileoverview MissingInformationAlert Component Object.
 * The inline "Missing Information" banner the Login screen shows when the form
 * is submitted with an empty username and/or password. The app gives it no test
 * ids or semantic keys: the locator matches English copy and breaks if the app
 * runs in Arabic. Its close (X) icon has no node of its own in the tree, so the
 * banner cannot be dismissed from here.
 * Evidence: .ui-evidence/login-miss-username-pass-locators.yml
 *   - "alert\nMissing Information\nPlease enter both your username and password to log in." [View]
 */
export class MissingInformationAlert {
  constructor(private readonly screen: Screen) {}

  // ============================================================================
  // LOCATORS (private factory methods)
  // ============================================================================

  /** Role-less View with a merged label: matched by getByText's label fallback. */
  private getAlert() {
    return this.screen.getByText(/^alert\nMissing Information\n/);
  }

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  /** Verifies that the banner is shown. */
  async verifyShown(): Promise<void> {
    await expect(this.getAlert(), 'Missing Information alert is shown').toBeVisible();
  }
}
