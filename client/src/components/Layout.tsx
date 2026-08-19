import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Shared shell for every authenticated page: top nav + <Outlet/> for the
 * matched child route. Kept separate from ProtectedRoute so the "requires
 * auth" check and "what the page looks like" concerns don't mix.
 */
export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <nav className="app-nav">
          <span className="app-brand">TradeFlow Lite</span>
          <NavLink to="/dashboard" className={navClass}>
            Dashboard
          </NavLink>
          <NavLink to="/trades" end className={navClass}>
            Trade Requests
          </NavLink>
          <NavLink to="/trades/new" className={navClass}>
            New Request
          </NavLink>
        </nav>
        <div className="app-user">
          <span>
            {user?.name} <span className="app-role">({user?.role})</span>
          </span>
          <button type="button" className="btn-secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  );
}

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'app-nav-link active' : 'app-nav-link';
}
