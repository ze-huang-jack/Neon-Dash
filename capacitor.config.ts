import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jack.neondash.app',
  appName: 'neon-dash-react',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    captureInput: true
  },
  plugins: {
    ScreenOrientation: {
      orientation: 'sensor'
    }
  }
};

export default config;
