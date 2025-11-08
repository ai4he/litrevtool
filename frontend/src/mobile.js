/**
 * Mobile-specific initialization for Capacitor
 * This file handles mobile app lifecycle, splash screen, and status bar
 */

import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';

/**
 * Initialize mobile-specific features
 */
export const initMobile = async () => {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  console.log('Initializing mobile app...');
  console.log('Platform:', Capacitor.getPlatform());

  try {
    // Configure status bar
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#1976d2' });

    // Hide splash screen after app is ready
    setTimeout(async () => {
      await SplashScreen.hide();
    }, 2000);

    // Handle app state changes
    CapApp.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active:', isActive);
    });

    // Handle back button (Android)
    CapApp.addListener('backButton', ({ canGoBack }) => {
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
export const isMobileApp = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Get platform name (ios, android, web)
 */
export const getPlatform = () => {
  return Capacitor.getPlatform();
};
