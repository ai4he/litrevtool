import Cookies from 'js-cookie';

export interface User {
  id: number;
  email: string;
  name: string;
  picture?: string;
  google_id: string;
}

// Cookie-based auth (works with SSR)
const TOKEN_KEY = 'auth_token';

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return Cookies.get(TOKEN_KEY) || null;
};

export const setToken = (token: string): void => {
  Cookies.set(TOKEN_KEY, token, {
    expires: 7, // 7 days
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
};

export const removeToken = (): void => {
  // Remove with the same options used when setting the cookie
  Cookies.remove(TOKEN_KEY, {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};
