import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Placeholder for Phases 1-3 — proves the protected route + auth flow
 * works. Replaced with real stats/recent-requests in Phase 5 (Analytics).
 */
export function Dashboard() {
  const { user } = useAuth();

  return (
    <main className="page">
      <h1>Dashboard</h1>
      <p>
        Signed in as <strong>{user?.name}</strong> ({user?.email}) — role:{' '}
        <strong>{user?.role}</strong>
      </p>
      <p>
        <Link to="/trades" className="btn">
          View trade requests
        </Link>
      </p>
    </main>
  );
}
