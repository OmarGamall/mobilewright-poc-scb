import { defineConfig, type MobilewrightConfig } from 'mobilewright';

const config: MobilewrightConfig = {
  platform: 'android',
  bundleId: 'com.example.scb_automation_app', 
};

export default defineConfig(config);
