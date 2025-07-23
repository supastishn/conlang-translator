import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthPage from '../src/pages/AuthPage';

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    login: jest.fn(),
    register: jest.fn()
  })
}));

describe('AuthPage', () => {
  test('renders login form', () => {
    render(<AuthPage type="login" />);
    expect(screen.getByLabelText('Email:')).toBeInTheDocument();
    expect(screen.getByLabelText('Password:')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  test('shows password mismatch error', () => {
    render(<AuthPage type="register" />);
    fireEvent.change(screen.getByLabelText('Password:'), { target: { value: 'pass1' } });
    fireEvent.change(screen.getByLabelText('Confirm Password:'), { target: { value: 'pass2' } });
    fireEvent.click(screen.getByText('Register'));
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  test('submits login form', async () => {
    const { useAuth } = require('../src/context/AuthContext');
    const mockLogin = jest.fn();
    useAuth.mockReturnValue({ login: mockLogin });

    render(<AuthPage type="login" />);
    fireEvent.change(screen.getByLabelText('Email:'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Password:'), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });
});
