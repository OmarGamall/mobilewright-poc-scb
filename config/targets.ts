/**
 * @fileoverview Test targets: the committed, team-wide answer to "what can we run on?".
 *
 * Each target becomes one Mobilewright project in `mobilewright.config.ts`; pick one per
 * run with `--project=<target>` (or the matching `npm run test:*` script). Machine-specific
 * settings (which device, which local build) live in `.env`, read by `config/env.ts`.
 */

export type Platform = 'android' | 'ios';

export interface Target {
  platform: Platform;
  deviceType: 'real' | 'emulator' | 'simulator';
}

export const TARGETS = {
  'android-real': { platform: 'android', deviceType: 'real' },
  'android-emulator': { platform: 'android', deviceType: 'emulator' },
  'ios-simulator': { platform: 'ios', deviceType: 'simulator' },
  'ios-real': { platform: 'ios', deviceType: 'real' },
} as const satisfies Record<string, Target>;

export type TargetName = keyof typeof TARGETS;

/**
 * App bundle identifier per platform. Committed per branch (each branch targets its own app).
 * iOS is unknown yet: while it is undefined, the iOS targets are not defined as projects.
 */
export const BUNDLE_IDS: Record<Platform, string | undefined> = {
  android: 'com.example.scb_automation_app',
  ios: undefined,
};
