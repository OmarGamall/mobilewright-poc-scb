import type { Screen } from '@mobilewright/core';
import { expect } from '@mobilewright/test';
import { BottomNavBar, type NavTab } from '@components/BottomNavBar';
import { EnableBiometricPopup } from '@components/EnableBiometricPopup';
import { step } from '@utils/step';

export type QuickAction = 'Transfer' | 'Donate' | 'Open CD' | 'Ex. Rate';

/**
 * @fileoverview Page Object Model for the retail-staging Home screen (first viewport:
 * header greeting, quick actions, bottom nav). Content below the fold (balance,
 * events, accounts) is not covered yet.
 * The app gives this screen no test ids or semantic keys: every locator matches
 * English copy and breaks if the app runs in Arabic.
 * Evidence: .ui-evidence/home1-locators.yml
 */
export class HomePage {
  constructor(private readonly screen: Screen) {}

  // ============================================================================
  // LOCATORS (private factory methods)
  // ============================================================================

  /** Exact label: the account cards' merged labels ("Avatar\nCurrent Account…") don't match. */
  private getAvatar() {
    return this.screen.getByLabel('Avatar');
  }

  private getGreeting() {
    return this.screen.getByLabel('Hi,');
  }

  /** @param displayName - The user's name, shown in its own View next to "Hi,". */
  private getUserName(displayName: string) {
    return this.screen.getByLabel(displayName);
  }

  /**
   * Every View on screen, in document order. The header's "Avatar", "Hi," and
   * name are sibling Views with no container or id, so the name is only
   * reachable by its position after "Hi,".
   */
  private getViews() {
    // Full native class: the capture's `type: View` is shortened from android.view.View.
    return this.screen.getByType('android.view.View');
  }

  /** Role-less View with a merged label: matched by getByText's label fallback. */
  private getQuickActionsSection() {
    return this.screen.getByText(/^Quick actions\n/);
  }

  /**
   * Quick action tiles are a mix of View and ImageView, so they share no role;
   * match the label inside the section.
   * @param action - The tile to locate.
   */
  private getQuickAction(action: QuickAction) {
    return this.getQuickActionsSection().getByLabel(action);
  }

  private navBar() {
    return new BottomNavBar(this.screen);
  }

  private biometricPopup() {
    return new EnableBiometricPopup(this.screen);
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Opens a quick action. The caller verifies the destination screen.
   * @param action - The quick action tile to tap.
   */
  @step('Open quick action "{0}"')
  async openQuickAction(action: QuickAction): Promise<void> {
    await this.getQuickAction(action).tap();
  }

  /**
   * Taps a bottom navigation tab. The caller verifies the destination screen.
   * @param tab - The tab to navigate to.
   */
  @step('Navigate to tab "{0}"')
  async navigateTo(tab: NavTab): Promise<void> {
    await this.navBar().navigateTo(tab);
  }

  /**
   * Accepts biometric login in the post-login popup. The app then opens the
   * Terms and Conditions screen; the caller verifies it.
   */
  @step('Enable biometric login')
  async enableBiometric(): Promise<void> {
    await this.biometricPopup().enable();
  }

  /** Declines biometric login ("Later") in the post-login popup and waits for it to close. */
  @step('Decline biometric login')
  async declineBiometric(): Promise<void> {
    await this.biometricPopup().decline();
  }

  /**
   * Reads the name the Home header greets the user with: the View right after
   * "Hi,". Positional and fragile; used only to capture unknown display names.
   * @returns The displayed name.
   */
  async getDisplayName(): Promise<string> {
    await this.getGreeting().waitFor({ state: 'visible' });
    const views = await this.getViews().all();
    for (const [index, view] of views.entries()) {
      if ((await view.getText()) === 'Hi,') {
        const nameView = views[index + 1];
        if (!nameView) break;
        return nameView.getText();
      }
    }
    throw new Error('Home header: no View found after the "Hi," greeting');
  }

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  /**
   * Verifies that the Home screen is shown and its header greets the user.
   * @param displayName - The name the header is expected to show.
   */
  @step('Verify on Home screen greeting "{0}"')
  async verifyOnHomeScreen(displayName: string): Promise<void> {
    await expect(this.getGreeting(), 'Home header shows the "Hi," greeting').toBeVisible();
    await expect.soft(this.getAvatar(), 'Home header shows the avatar').toBeVisible();
    await expect.soft(this.getUserName(displayName), 'Home header shows the user name').toBeVisible();
  }

  /** Verifies that the post-login "Enable Biometric" popup is shown. */
  @step('Verify biometric popup is shown')
  async verifyBiometricPopupShown(): Promise<void> {
    await this.biometricPopup().verifyShown();
  }
}
