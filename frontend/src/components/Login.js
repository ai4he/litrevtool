import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
} from '@mui/material';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    const success = await login(credentialResponse.credential);
    if (success) {
      navigate('/dashboard');
    }
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
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

export default Login;
