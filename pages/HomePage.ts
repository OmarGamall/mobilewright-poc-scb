import type { Screen } from '@mobilewright/core';
import { DatePicker, type PickerDate } from '../components/DatePicker';
import { Checkbox } from '../components/Checkbox';
import { BottomNavBar, type NavTab } from '../components/BottomNavBar';
import { step } from '../utils/step';
import { expect } from '@mobilewright/test';

/**
 * @fileoverview Page Object Model for the Home screen.
 * Handles the Phase 3 home screen form including text inputs, country selection,
 * checkboxes, date pickers, and bottom navigation.
 */
export class HomePage {
  readonly screen: Screen;

  constructor(screen: Screen) {
    this.screen = screen;
  }

  // ============================================================================
  // LOCATORS (private factory methods)
  // ============================================================================

  private getPhase3Label() {
    return this.screen.getByLabel('Phase 3');
  }

  private getUsernameInput() {
    return this.screen
      .getByLabel('LOGIN_INPUT_USERNAME')
      .getByRole('textfield');
  }

  private getCountryDropdown() {
    return this.screen.getByRole('button', { name: 'HOME_DROPDOWN_COUNTRY' });
  }

  private getCountryOption(country: string) {
    return this.screen.getByRole('button', { name: country });
  }

  private getTermsCheckbox() {
    return new Checkbox(this.screen.getByRole('checkbox', { name: 'HOME_CHECKBOX_TERMS' }));
  }

  private getDatePickerButton() {
    return this.screen.getByRole('button', { name: /HOME_DATE_PICKER/ });
  }

  private navBar() {
    return new BottomNavBar(this.screen);
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  // Tier 1 — Composite actions

  /**
   * Fills the username field.
   * @param username - The username to enter.
   */
  @step('Input username "{0}"')
  async inputUsername(username: string): Promise<void> {
    await this.getUsernameInput().fill(username);
  }

  /**
   * Opens the country dropdown and selects a specific country by its display name.
   * @param country - The exact visible country name as shown in the dropdown.
   */
  @step('Select country "{0}"')
  async selectCountry(country: string): Promise<void> {
    await this.getCountryDropdown().tap();
    await this.getCountryOption(country).tap();
  }

  /**
   * Sets the terms checkbox to the desired checked state.
   * @param check - True to check the box, false to uncheck.
   */
  @step('Set terms checkbox state to {0}')
  async setTermsCheckboxState(check: boolean): Promise<void> {
    await this.getTermsCheckbox().setState(check);
  }

  /**
   * Opens the Date Picker and selects a specific date.
   * @param date - The PickerDate object (year, month, day) to select.
   */
  @step('Select date "{0}"')
  async selectDate(date: PickerDate): Promise<void> {
    await this.getDatePickerButton().tap();
    await new DatePicker(this.screen).pick(date);
  }

  /**
   * Taps the specified bottom navigation tab to navigate to it.
   * Delegates to the shared BottomNavBar component.
   * @param tab - The tab to navigate to ('Home', 'Profile', or 'Menu').
   */
  @step('Navigate to tab "{0}"')
  async navigateTo(tab: NavTab): Promise<void> {
    await this.navBar().navigateTo(tab);
  }

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  /**
   * Verifies that the user has successfully reached the Phase 3 home screen.
   */
  @step('Verify on Phase 3 screen')
  async verifyOnPhase3Screen(): Promise<void> {
    await expect(this.getPhase3Label()).toBeVisible();
  }

  /**
   * Verifies that the specified bottom nav tab is visible.
   * @param tab - The tab expected to be visible in the nav bar.
   */
  @step('Verify nav tab "{0}" is visible')
  async verifyNavTabVisible(tab: NavTab): Promise<void> {
    await this.navBar().verifyTabVisible(tab);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
}
