import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.becomeme',
  appName: 'becomeme',
  webDir: 'dist',
  server: {
    url: 'https://205ace93-63ac-4abe-8082-3fe0d744b6dc.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
