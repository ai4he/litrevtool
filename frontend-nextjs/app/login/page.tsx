'use client';

import React, { useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { Container, Paper, Typography, Box } from '@mui/material';
import { GoogleOAuthProvider } from '@/lib/GoogleOAuthProvider';
import { authAPI } from '@/lib/api';

function LoginContent() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if already logged in
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      // Call backend API to verify Google credential and get JWT + user data
      const response = await authAPI.googleLogin(credentialResponse.credential);
      const { access_token, user: userData } = response.data;

      // Update auth context with token and user data
      login(access_token, userData);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
  };

  if (isLoading) {
    return null;
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            LitRevTool
          </Typography>
          <Typography variant="body1" align="center" color="textSecondary" paragraph>
            Advanced Google Scholar Literature Review Tool
          </Typography>
          <Typography variant="body2" align="center" color="textSecondary" paragraph>
            Extract more than 1000 papers with advanced filtering and semantic analysis
          </Typography>
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
            />
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default function Login() {
  return (
    <GoogleOAuthProvider>
      <LoginContent />
    </GoogleOAuthProvider>
  );
}
