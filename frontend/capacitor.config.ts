import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.labourbook.app',
  appName: 'Labour Book',
  webDir: 'out',
  server: {
    cleartext: true
  }
};

export default config;
