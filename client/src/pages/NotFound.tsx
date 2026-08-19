import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <main className="page-status">
      <h1>404 — Page not found</h1>
      <p>
        <Link to="/">Go back home</Link>
      </p>
    </main>
  );
}
