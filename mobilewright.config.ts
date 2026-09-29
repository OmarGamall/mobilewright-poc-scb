import { defineConfig, type MobilewrightConfig } from 'mobilewright';

const config: MobilewrightConfig = {
  platform: 'android',
  bundleId: 'com.example.scb_automation_app', 
  reporter: [['html', { outputFolder: 'mobilewright-report' }]],
  viewTree: 'on-failure',

  // 1. Overall test timeout (60 seconds per test)
  timeout: 60000, 
  
  // 2. Assertion timeout (10 seconds for expect assertions)
  expect: {
    timeout: 10000,
  },
  
  // 3. Action and App-specific timeouts
  use: {
    actionTimeout: 10000,     // 10 seconds for tap, fill, etc.
    appLaunchTimeout: 30000,  // 30 seconds for app to boot up
  }
};

export default defineConfig(config);
