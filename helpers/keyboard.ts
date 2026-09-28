import type { Screen } from '@mobilewright/core';

/**
 * @fileoverview Reusable cross-screen helper functions for keyboard management.
 */

/**
 * Dismisses the software keyboard natively.
 * 
 * In mobile automation, if a valid `.tap()` executes but the app does not respond,
 * it is often because the software keyboard was open and intercepted the tap (or 
 * blocked the element). 
 * 
 * Sending the Android hardware back button event (`screen.goBack()`) will safely 
 * and natively dismiss the software keyboard.
 * 
 * @param screen - The Mobilewright screen instance.
 */
export async function dismissKeyboard(screen: Screen): Promise<void> {
  await screen.goBack();
}
