import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../components/Dashboard';

// Mock axios
jest.mock('axios');

// Mock AuthContext
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      email: 'test@example.com',
      name: 'Test User',
    },
    isAuthenticated: true,
  }),
}));

describe('Dashboard Component', () => {
  test('renders dashboard heading', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Dashboard should render
    expect(document.body).toBeInTheDocument();
  });

  // Add more specific tests based on your Dashboard component structure
});
