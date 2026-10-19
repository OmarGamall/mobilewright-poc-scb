import type { Screen } from '@mobilewright/core';
import { expect } from '@mobilewright/test';

/**
 * @fileoverview EnableBiometricPopup Component Object.
 * The "Enable Biometric" dialog shown right after login, over the Home screen.
 * The app gives it no test ids or semantic keys: every locator matches English
 * copy and breaks if the app runs in Arabic. The root "dialogKey" View is not
 * used as the anchor: the name is generic, so other dialogs likely share it.
 * Evidence: .ui-evidence/enable-biometric-popup-locators.yml
 *   - "Enable Biometric" [View]
 *   - "Enable"           [Button]
 *   - "Later"            [Button]
 */
export class EnableBiometricPopup {
  constructor(private readonly screen: Screen) {}

  // ============================================================================
  // LOCATORS (private factory methods)
  // ============================================================================

  private getTitle() {
    return this.screen.getByLabel('Enable Biometric');
  }

  private getEnableButton() {
    return this.screen.getByRole('button', { name: 'Enable' });
  }

  private getLaterButton() {
    return this.screen.getByRole('button', { name: 'Later' });
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Accepts biometric login. The app then opens the Terms and Conditions screen;
   * the caller verifies it through that screen's POM.
   */
  async enable(): Promise<void> {
    await this.getEnableButton().tap();
  }

  /**
   * Declines biometric login ("Later") and waits for the popup to close, so the
   * caller's next tap can't land on the closing dialog.
   */
  async decline(): Promise<void> {
    await this.getLaterButton().tap();
    await this.getTitle().waitFor({ state: 'hidden' });
  }

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  /** Verifies that the popup is shown. */
  async verifyShown(): Promise<void> {
    await expect(this.getTitle()).toBeVisible();
  }
}
