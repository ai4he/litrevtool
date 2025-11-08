import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.haielab.litrevtool',
  appName: 'LitRevTool',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    // For development, you can use your local backend
    // url: 'http://10.0.2.2:3001', // Android emulator localhost
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1976d2',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1976d2',
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '337048330114-f2kimcqsu1fi4h1unmuno10cr8gcnetp.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
