import type { Screen } from '@mobilewright/core';
import { DatePicker, type PickerDate } from '../components/DatePicker';
import { Checkbox } from '../components/Checkbox';

/**
 * @fileoverview Page Object Model for the Home screen.
 * Handles the Phase 3 home screen form including text inputs, country selection,
 * checkboxes, and date pickers.
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

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Fills the username field.
   * @param username - The username to enter.
   */
  async inputUsername(username: string): Promise<void> {
    await this.getUsernameInput().fill(username);
  }

  /**
   * Opens the country dropdown and selects a specific country.
   * @param country - The country to select ('Egypt' or 'India').
   */
  async selectCountry(country: 'Egypt' | 'India'): Promise<void> {
    await this.getCountryDropdown().tap();
    await this.getCountryOption(country).tap();
  }

  /**
   * Sets the terms checkbox to the desired checked state.
   * @param check - True to check the box, false to uncheck.
   */
  async setTermsCheckboxState(check: boolean): Promise<void> {
    await this.getTermsCheckbox().setState(check);
  }

  /**
   * Opens the Date Picker and selects a specific date.
   * @param date - The PickerDate object (year, month, day) to select.
   */
  async selectDate(date: PickerDate): Promise<void> {
    await this.getDatePickerButton().tap();
    await new DatePicker(this.screen).pick(date);
  }

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  /**
   * Verifies that the user has successfully reached the Phase 3 home screen.
   */
  async verifyOnPhase3Screen(): Promise<void> {
    await this.getPhase3Label().waitFor({ state: 'visible' });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
}
