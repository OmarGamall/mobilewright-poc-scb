import * as dotenv from 'dotenv';

// Load .env file into process.env — must run before any env var is read.
// Any file that imports ENV gets resolved values automatically.
dotenv.config();

export const ENV = {
  /** Android device serial — find yours by running: adb devices */
  deviceId: process.env.DEVICE_ID ?? '',

  /** Flutter app bundle identifier */
  bundleId: process.env.BUNDLE_ID ?? '',
} as const;
