import { defineConfig, type MobilewrightProjectConfig } from 'mobilewright';
import { ENV } from './config/env';
import { BUNDLE_IDS, TARGETS, type TargetName } from './config/targets';

const APPS = { android: ENV.androidApp, ios: ENV.iosApp } as const;

/** One project per target whose platform has a known bundle ID; select with `--project=<name>`. */
const projects: MobilewrightProjectConfig[] = (Object.keys(TARGETS) as TargetName[])
  .filter((name) => BUNDLE_IDS[TARGETS[name].platform] !== undefined)
  .map((name) => {
    const { platform, deviceType } = TARGETS[name];
    return {
      name,
      use: {
        platform,
        deviceType,
        bundleId: BUNDLE_IDS[platform],
        deviceId: ENV.deviceId,
        installApps: APPS[platform],
      },
    };
  });

export default defineConfig({
  projects,
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
