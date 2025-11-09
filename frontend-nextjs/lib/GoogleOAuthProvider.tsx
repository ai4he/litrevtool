'use client';

import React from 'react';
import { GoogleOAuthProvider as GoogleProvider } from '@react-oauth/google';

export const GoogleOAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  if (!clientId) {
    console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured');
    return <>{children}</>;
  }

  return <GoogleProvider clientId={clientId}>{children}</GoogleProvider>;
};
