import type { Screen } from '@mobilewright/core';
import { expect } from '@mobilewright/test';
import { dismissKeyboard } from '../helpers/keyboard';
import { step } from '../utils/step';

export type NavTab = 'Home' | 'Profile' | 'Menu';

/**
 * @fileoverview BottomNavBar Component Object.
 * Wraps the 3-tab bottom navigation bar shared across all authenticated screens.
 * Evidence: .ui-evidence/home-locators.yml
 *   - "Home\nTab 1 of 3"    [selected: true]
 *   - "Profile\nTab 2 of 3"
 *   - "Menu\nTab 3 of 3"
 */
export class BottomNavBar {
  constructor(private readonly screen: Screen) {}

  // ============================================================================
  // LOCATORS (private factory methods)
  // ============================================================================

  /**
   * Returns a dynamic locator for a nav tab by its display name.
   * Uses a regex prefix because tab labels contain a newline + "Tab N of 3" suffix.
   * @param tab - The tab name to locate.
   */
  private getTab(tab: NavTab) {
    return this.screen.getByRole('button', { name: new RegExp(`^${tab}`) });
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Taps the specified bottom navigation tab to navigate to it.
   * Automatically dismisses the software keyboard first to ensure the tab is hittable.
   * @param tab - The tab to navigate to ('Home', 'Profile', or 'Menu').
   */
  @step('Navigate to tab "{0}"')
  async navigateTo(tab: NavTab): Promise<void> {
    await dismissKeyboard(this.screen);
    await this.getTab(tab).tap();
  }

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  /**
   * Verifies that the specified nav tab is visible in the bottom navigation bar.
   * @param tab - The tab expected to be visible.
   */
  @step('Verify tab "{0}" is visible')
  async verifyTabVisible(tab: NavTab): Promise<void> {
    await expect(this.getTab(tab)).toBeVisible();
  }
}
