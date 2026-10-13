import * as dotenv from 'dotenv';
import { existsSync } from 'node:fs';

/**
 * @fileoverview Machine-specific settings, read from `.env` locally or from the CI job's
 * environment. Every variable is optional; see `.env.example`. Team-wide settings
 * (targets, bundle IDs) live in `config/targets.ts`.
 */

// Load .env into process.env before any variable is read. Variables already set
// (e.g. by CI) are not overwritten.
dotenv.config();

/** Returns the variable, or undefined when it is unset or blank. */
function optional(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

/** Returns the path in the variable, or undefined when unset; fails fast if the file is missing. */
function optionalFile(name: string): string | undefined {
  const path = optional(name);
  if (path && !existsSync(path)) {
    throw new Error(`[config/env] ${name}="${path}" does not exist. Fix the path or unset ${name}.`);
  }
  return path;
}

export const ENV = {
  /** Pin one device (serial from `adb devices`, or simulator UDID). Unset = first matching device. */
  deviceId: optional('DEVICE_ID'),

  /** APK installed before the run on Android targets. Unset = the app is already installed. */
  androidApp: optionalFile('ANDROID_APP'),

  /** IPA installed before the run on iOS targets. Unset = the app is already installed. */
  iosApp: optionalFile('IOS_APP'),
} as const;
