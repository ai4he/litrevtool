import Cookies from 'js-cookie';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

/**
 * Save authentication token to cookies
 */
export const setToken = (token: string): void => {
  Cookies.set(TOKEN_KEY, token, {
    expires: 7, // 7 days
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
};

/**
 * Get authentication token from cookies
 */
export const getToken = (): string | undefined => {
  return Cookies.get(TOKEN_KEY);
};

/**
 * Remove authentication token from cookies
 */
export const removeToken = (): void => {
  Cookies.remove(TOKEN_KEY);
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

/**
 * Save user data to localStorage
 */
export const setUser = (user: any): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

/**
 * Get user data from localStorage
 */
export const getUser = (): any => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }
  return null;
};

/**
 * Remove user data from localStorage
 */
export const removeUser = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_KEY);
  }
};

/**
 * Clear all authentication data
 */
export const logout = (): void => {
  removeToken();
  removeUser();
};
