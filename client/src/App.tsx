import { useEffect, useState } from 'react';

interface HealthStatus {
  status: string;
  db: string;
  timestamp: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

/**
 * Phase 0 placeholder: pings the backend /api/health endpoint to prove
 * the client and server are wired together. Replaced by React Router
 * pages in Phase 3.
 */
function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json() as Promise<HealthStatus>)
      .then(setHealth)
      .catch(() => setError('Could not reach the TradeFlow Lite API'));
  }, []);

  return (
    <main className="status-page">
      <h1>TradeFlow Lite</h1>
      <p>Full-stack trade-finance workflow demo.</p>
      {error && <p className="status-error">{error}</p>}
      {!error && !health && <p>Checking API status…</p>}
      {health && (
        <p className="status-ok">
          API status: <strong>{health.status}</strong> · DB: <strong>{health.db}</strong>
        </p>
      )}
    </main>
  );
}

export default App;
