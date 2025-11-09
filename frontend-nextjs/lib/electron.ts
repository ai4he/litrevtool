/**
 * Electron integration for Next.js
 * Detects Electron environment and retrieves API configuration
 */

export interface ElectronAPI {
  getApiUrl: () => Promise<string>;
  getApiUrls: () => Promise<{
    mode: 'local' | 'cloud' | 'hybrid';
    primary: string;
    secondary: string | null;
  }>;
  getApiMode: () => Promise<'local' | 'cloud' | 'hybrid'>;
  setApiMode: (mode: 'local' | 'cloud' | 'hybrid') => Promise<any>;
}

/**
 * Check if running in Electron
 */
export const isElectron = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check for Electron-specific properties
  return !!(
    window.navigator.userAgent.includes('Electron') ||
    (window as any).electron ||
    (window.process as any)?.type === 'renderer'
  );
};

/**
 * Get Electron API
 * Returns undefined if not running in Electron
 */
export const getElectronAPI = (): ElectronAPI | undefined => {
  if (typeof window === 'undefined' || !isElectron()) {
    return undefined;
  }

  return (window as any).electron as ElectronAPI;
};

/**
 * Get API URL from Electron or fallback to environment variable
 */
export const getApiUrl = async (): Promise<string> => {
  const electronAPI = getElectronAPI();

  if (electronAPI) {
    try {
      const apiUrl = await electronAPI.getApiUrl();
      console.log('Using Electron API URL:', apiUrl);
      return apiUrl;
    } catch (error) {
      console.error('Error getting API URL from Electron:', error);
    }
  }

  // Fallback to environment variable
  const fallbackUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  console.log('Using fallback API URL:', fallbackUrl);
  return fallbackUrl;
};

/**
 * Get API URLs for hybrid mode
 */
export const getApiUrls = async (): Promise<{
  mode: 'local' | 'cloud' | 'hybrid';
  primary: string;
  secondary: string | null;
}> => {
  const electronAPI = getElectronAPI();

  if (electronAPI) {
    try {
      const apiUrls = await electronAPI.getApiUrls();
      console.log('Using Electron API URLs:', apiUrls);
      return apiUrls;
    } catch (error) {
      console.error('Error getting API URLs from Electron:', error);
    }
  }

  // Fallback to single URL
  const fallbackUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return {
    mode: 'local',
    primary: fallbackUrl,
    secondary: null,
  };
};

/**
 * Get current API mode
 */
export const getApiMode = async (): Promise<'local' | 'cloud' | 'hybrid'> => {
  const electronAPI = getElectronAPI();

  if (electronAPI) {
    try {
      return await electronAPI.getApiMode();
    } catch (error) {
      console.error('Error getting API mode from Electron:', error);
    }
  }

  return 'local';
};

/**
 * Set API mode (Electron only)
 */
export const setApiMode = async (mode: 'local' | 'cloud' | 'hybrid'): Promise<void> => {
  const electronAPI = getElectronAPI();

  if (electronAPI) {
    try {
      await electronAPI.setApiMode(mode);
      console.log('API mode set to:', mode);
    } catch (error) {
      console.error('Error setting API mode:', error);
      throw error;
    }
  } else {
    throw new Error('setApiMode is only available in Electron');
  }
};
