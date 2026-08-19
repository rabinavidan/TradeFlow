import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from '../pages/Login';
import { renderWithProviders } from './testUtils';
import * as authApi from '../api/auth.api';
import { TOKEN_STORAGE_KEY } from '../api/client';

vi.mock('../api/auth.api');

const mockedAuthApi = vi.mocked(authApi);

describe('<Login />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows validation errors when submitting an empty form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />, { route: '/login' });

    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    expect(mockedAuthApi.loginRequest).not.toHaveBeenCalled();
  });

  it('shows the server error message when login fails', async () => {
    mockedAuthApi.loginRequest.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } } },
    });
    const user = userEvent.setup();
    renderWithProviders(<Login />, { route: '/login' });

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it('submits valid credentials and stores the returned token', async () => {
    mockedAuthApi.loginRequest.mockResolvedValueOnce({
      token: 'fake-jwt-token',
      user: { id: '1', name: 'Ada', email: 'ada@example.com', role: 'user', createdAt: new Date().toISOString() },
    });
    const user = userEvent.setup();
    renderWithProviders(<Login />, { route: '/login' });

    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/password/i), 'supersecret123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockedAuthApi.loginRequest).toHaveBeenCalledWith({
        email: 'ada@example.com',
        password: 'supersecret123',
      });
    });
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('fake-jwt-token');
  });
});
