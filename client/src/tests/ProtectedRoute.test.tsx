import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';
import { TOKEN_STORAGE_KEY } from '../api/client';
import * as authApi from '../api/auth.api';

vi.mock('../api/auth.api');
const mockedAuthApi = vi.mocked(authApi);

function renderProtected(initialRoute: string, { children }: { children?: ReactNode } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<p>Login page</p>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={children ?? <p>Secret dashboard content</p>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('<ProtectedRoute />', () => {
  it('redirects to /login when there is no stored token', async () => {
    localStorage.clear();
    renderProtected('/dashboard');

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Secret dashboard content')).not.toBeInTheDocument();
  });

  it('renders the protected content when a valid session exists', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-token');
    mockedAuthApi.fetchCurrentUser.mockResolvedValueOnce({
      id: '1',
      name: 'Ada',
      email: 'ada@example.com',
      role: 'user',
      createdAt: new Date().toISOString(),
    });

    renderProtected('/dashboard');

    await waitFor(() => {
      expect(screen.getByText('Secret dashboard content')).toBeInTheDocument();
    });
  });
});
