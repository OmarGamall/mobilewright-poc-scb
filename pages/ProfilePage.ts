import type { Screen } from '@mobilewright/core';
import { expect } from '@mobilewright/test';
import { BottomNavBar, type NavTab } from '@components/BottomNavBar';
import { step } from '../utils/step';

/**
 * @fileoverview Page Object Model for the Profile screen.
 * Displays the authenticated user's profile information.
 * Evidence: .ui-evidence/profile-locators.yml
 */
export class ProfilePage {
  constructor(private readonly screen: Screen) {}

  // ============================================================================
  // LOCATORS (private factory methods)
  // ============================================================================

  private getProfileHeader() {
    return this.screen.getByLabel('Profile');
  }

  private navBar() {
    return new BottomNavBar(this.screen);
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Taps the specified bottom navigation tab to navigate away from this screen.
   * @param tab - The tab to navigate to ('Home', 'Profile', or 'Menu').
   */
  async navigateTo(tab: NavTab): Promise<void> {
    await this.navBar().navigateTo(tab);
  }

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  /**
   * Verifies the user has landed on the Profile screen by waiting for the
   * Profile header to become visible.
   * Evidence: View label "Profile" confirmed in .ui-evidence/profile-locators.yml
   */
  @step('Verify on Profile screen')
  async verifyOnProfileScreen(): Promise<void> {
    await expect(this.getProfileHeader()).toBeVisible();
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
}
