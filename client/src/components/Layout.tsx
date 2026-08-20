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
      <aside className="rail">
        <div className="rail-brand">
          <span className="rail-brand-dot" aria-hidden="true" />
          TradeFlow
        </div>
        <nav className="rail-nav">
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
        <div className="rail-user">
          <div className="rail-user-id">
            <div className="rail-user-name">{user?.name}</div>
            <div className="rail-user-role">{user?.role}</div>
          </div>
          <button type="button" className="btn-secondary rail-logout" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <div className="main-col">
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'rail-link active' : 'rail-link';
}
