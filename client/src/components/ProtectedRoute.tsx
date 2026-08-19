import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Wraps a set of nested routes (via <Outlet/>) and redirects to /login
 * when there's no authenticated user. The attempted location is passed
 * along so Login can send the user back after a successful sign-in.
 */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="page-status">
        <p>Loading…</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
