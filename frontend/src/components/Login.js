import React, { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const loginAttempted = useRef(false);
  const [loading, setLoading] = useState(false);
  const isMobile = Capacitor.isNativePlatform();

  // Initialize Google Auth for mobile
  useEffect(() => {
    if (isMobile) {
      GoogleAuth.initialize();
    }
  }, [isMobile]);

  // Navigate to dashboard when user state is updated after login
  useEffect(() => {
    if (user && loginAttempted.current) {
      navigate('/dashboard');
      loginAttempted.current = false;
    }
  }, [user, navigate]);

  // Web OAuth handler
  const handleGoogleSuccess = async (credentialResponse) => {
    loginAttempted.current = true;
    setLoading(true);
    try {
      await login(credentialResponse.credential);
      // Navigation will happen in useEffect when user state is updated
    } catch (error) {
      console.error('Login failed:', error);
      loginAttempted.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
    loginAttempted.current = false;
    setLoading(false);
  };

  // Mobile native OAuth handler
  const handleNativeGoogleLogin = async () => {
    loginAttempted.current = true;
    setLoading(true);
    try {
      const result = await GoogleAuth.signIn();
      console.log('Native Google Sign-In result:', result);

      // Use the ID token to authenticate with backend
      if (result.authentication?.idToken) {
        await login(result.authentication.idToken);
        // Navigation will happen in useEffect when user state is updated
      } else {
        console.error('No ID token received from native sign-in');
        loginAttempted.current = false;
      }
    } catch (error) {
      console.error('Native Google login failed:', error);
      loginAttempted.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: { xs: 4, sm: 8 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          px: { xs: 2, sm: 0 }
        }}
      >
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
            LitRevTool
          </Typography>
          <Typography variant="body1" align="center" color="textSecondary" paragraph sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Advanced Google Scholar Literature Review Tool
          </Typography>
          <Typography variant="body2" align="center" color="textSecondary" paragraph sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
            Extract more than 1000 papers with advanced filtering and semantic analysis
          </Typography>
          <Box sx={{ mt: { xs: 3, sm: 4 }, display: 'flex', justifyContent: 'center' }}>
            {loading ? (
              <CircularProgress />
            ) : isMobile ? (
              <Button
                variant="contained"
                size="large"
                startIcon={<GoogleIcon />}
                onClick={handleNativeGoogleLogin}
                sx={{
                  backgroundColor: '#fff',
                  color: '#757575',
                  border: '1px solid #dadce0',
                  textTransform: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '10px 12px',
                  '&:hover': {
                    backgroundColor: '#f8f9fa',
                    boxShadow: '0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15)',
                  },
                }}
              >
                Sign in with Google
              </Button>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
              />
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;
