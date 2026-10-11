import * as dotenv from 'dotenv';

// Load .env file into process.env — must run before any env var is read.
// Any file that imports ENV gets resolved values automatically.
dotenv.config();

export const ENV = {
  /** Android device serial — find yours by running: adb devices */
  deviceId: process.env.DEVICE_ID ?? '',

  /**
   * Flutter app bundle identifier.
   * Default is committed per branch (each branch targets its own app);
   * set BUNDLE_ID in .env or the shell to override.
   */
  bundleId: process.env.BUNDLE_ID ?? 'com.SCP.Not',
} as const;
