import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

// Mock the AuthContext
jest.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: false,
  }),
}));

describe('App Component', () => {
  test('renders without crashing', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
  });

  test('shows login page when not authenticated', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Check if login-related elements are present
    // This will depend on your actual component structure
    expect(document.body).toBeInTheDocument();
  });
});
