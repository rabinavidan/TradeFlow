import { useAuth } from '../hooks/useAuth';

/**
 * Placeholder for Phase 1 — proves the protected route + auth flow works.
 * Replaced with real stats/recent-requests in Phase 5 (Analytics).
 */
export function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <main className="page">
      <h1>Dashboard</h1>
      <p>
        Signed in as <strong>{user?.name}</strong> ({user?.email}) — role:{' '}
        <strong>{user?.role}</strong>
      </p>
      <button type="button" onClick={logout}>
        Log out
      </button>
    </main>
  );
}
