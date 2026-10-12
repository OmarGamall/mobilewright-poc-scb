import type { Screen } from '@mobilewright/core';

/**
 * @fileoverview Reusable cross-screen helper functions for keyboard management.
 */

/**
 * Closes the software keyboard after typing by sending ENTER, which submits the
 * focused field and clears its focus.
 *
 * Mobilewright cannot detect whether a keyboard is open, and whether one appears
 * depends on the device (emulators/simulators with a hardware keyboard show none).
 * ENTER is used instead of Android Back because Back navigates away when no
 * keyboard is open. Verified on a real Android device: ENTER closes the keyboard
 * and clears field focus.
 *
 * Call it (1) from the method that typed, after its last `fill()`, and (2) before
 * tapping anything the keyboard may cover (e.g. the bottom nav bar), because a
 * screen can auto-focus a field on arrival (Home does after login) with no typing
 * by our code.
 *
 * @param screen - The Mobilewright screen instance.
 */
export async function dismissKeyboard(screen: Screen): Promise<void> {
  await screen.pressButton('ENTER');
}
