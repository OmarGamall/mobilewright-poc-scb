import * as dotenv from 'dotenv';
import { defineConfig } from 'mobilewright';

// Machine-specific settings come from .env locally or from the CI job's environment;
// variables already set are not overwritten. See .env.example.
dotenv.config();

/** Returns the variable, or undefined when it is unset or blank. */
const env = (name: string): string | undefined => process.env[name]?.trim() || undefined;

export default defineConfig({
  /**
   * The app under test (Android package name), committed per branch. Every target launches
   * it by this ID before each test.
   */
  bundleId: 'com.example.scb_automation_app',
  /**
   * Pin one device (phone serial or emulator ID from `adb devices`). Applies to every target:
   * unset it to run on the other device type. Unset = first device matching the target's deviceType.
   */
  deviceId: env('DEVICE_ID'),
  /**
   * Local .apk to install before the run (e.g. the build CI downloaded). Only installs; the app
   * is always launched by bundleId. Unset = use the app already installed on the device.
   */
  installApps: env('ANDROID_APP'),

  /** One project per target; pick one per run with `--project=<name>` (or an npm script). */
  projects: [
    { name: 'android-real', use: { platform: 'android', deviceType: 'real' } },
    { name: 'android-emulator', use: { platform: 'android', deviceType: 'emulator' } },
  ],

  reporter: [['list'], ['html', { outputFolder: 'mobilewright-report' }]],
  forbidOnly: !!process.env.CI,
  viewTree: 'on-failure',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    actionTimeout: 10_000,
    appLaunchTimeout: 30_000,
  },
});
