import type { Screen } from '@mobilewright/core';
import { BottomNavBar, type NavTab } from '../components/BottomNavBar';

/**
 * @fileoverview Page Object Model for the Profile screen.
 * Displays the authenticated user's profile information.
 * Evidence: .ui-evidence/profile-locators.yml
 */
export class ProfilePage {
  readonly screen: Screen;

  constructor(screen: Screen) {
    this.screen = screen;
  }

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
  async verifyOnProfileScreen(): Promise<void> {
    await this.getProfileHeader().waitFor({ state: 'visible' });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
}
