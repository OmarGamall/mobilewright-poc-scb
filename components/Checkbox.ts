import type { Screen } from '@mobilewright/core';

type Locator = ReturnType<Screen['getByRole']>;

/**
 * @fileoverview Checkbox Component Object.
 * Reusable wrapper for standard Flutter Checkbox widgets.
 */
export class Checkbox {
  // Using explicit Locator type to avoid `any`.
  constructor(private readonly locator: Locator) {}

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Checks the checkbox if it is not already checked.
   */
  async check(): Promise<void> {
    const checked = await this.locator.isChecked();
    if (!checked) {
      await this.locator.tap();
    }
  }

  /**
   * Unchecks the checkbox if it is currently checked.
   */
  async uncheck(): Promise<void> {
    const checked = await this.locator.isChecked();
    if (checked) {
      await this.locator.tap();
    }
  }

  /**
   * Sets the checkbox to the desired state explicitly.
   * @param targetState - True to check, false to uncheck.
   */
  async setState(targetState: boolean): Promise<void> {
    if (targetState) {
      await this.check();
    } else {
      await this.uncheck();
    }
  }

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  /**
   * Returns whether the checkbox is currently checked.
   * @returns {Promise<boolean>} True if checked, false otherwise.
   */
  async isChecked(): Promise<boolean> {
    return await this.locator.isChecked();
  }
}
