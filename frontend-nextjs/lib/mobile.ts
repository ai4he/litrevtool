/**
 * Mobile-specific initialization for Capacitor in Next.js
 * This file handles mobile app lifecycle, splash screen, and status bar
 */

import { Capacitor } from '@capacitor/core';

// Dynamic imports for Capacitor plugins (only loaded on mobile platforms)
let SplashScreen: any;
let StatusBar: any;
let CapApp: any;
let GoogleAuth: any;

/**
 * Initialize mobile-specific features
 * Must be called client-side only
 */
export const initMobile = async () => {
  // Only run on native platforms
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
    return;
  }

  console.log('Initializing mobile app...');
  console.log('Platform:', Capacitor.getPlatform());

  try {
    // Dynamically import Capacitor plugins
    const splashModule = await import('@capacitor/splash-screen');
    const statusModule = await import('@capacitor/status-bar');
    const appModule = await import('@capacitor/app');
    const googleAuthModule = await import('@codetrix-studio/capacitor-google-auth');

    SplashScreen = splashModule.SplashScreen;
    StatusBar = statusModule.StatusBar;
    CapApp = appModule.App;
    GoogleAuth = googleAuthModule.GoogleAuth;

    // Initialize Google Auth for mobile
    GoogleAuth.initialize({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
    console.log('Google Auth initialized');

    // Configure status bar
    await StatusBar.setStyle({ style: 'Dark' });
    await StatusBar.setBackgroundColor({ color: '#1976d2' });

    // Hide splash screen after app is ready
    setTimeout(async () => {
      await SplashScreen.hide();
    }, 2000);

    // Handle app state changes
    CapApp.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
      console.log('App state changed. Is active:', isActive);
    });

    // Handle back button (Android)
    CapApp.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
      if (!canGoBack) {
        CapApp.exitApp();
      } else {
        window.history.back();
      }
    });

    console.log('Mobile app initialized successfully');
  } catch (error) {
    console.error('Error initializing mobile app:', error);
  }
};

/**
 * Check if running in mobile app
 */
export const isMobileApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
};

/**
 * Get platform name (ios, android, web)
 */
export const getPlatform = (): string => {
  if (typeof window === 'undefined') return 'web';
  return Capacitor.getPlatform();
};
