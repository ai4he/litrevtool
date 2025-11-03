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

export default Login;
