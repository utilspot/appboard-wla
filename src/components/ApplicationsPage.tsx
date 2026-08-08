import { useCallback, useEffect, useMemo, useState } from 'react';
import AppList from './AppList';
import { fetchApplications } from '../api';
import type { Application } from '../types';

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    // Which set is served is decided by the server (see the admin page in dev).
    fetchApplications({}, controller.signal)
      .then((response) => {
        setApplications(response);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause)) return;
        setError(cause instanceof Error ? cause.message : 'Unknown error');
        setApplications([]);
        setLoading(false);
      });

    return () => controller.abort();
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const visibleApplications = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return applications;
    return applications.filter(
      (application) =>
        application.title.toLowerCase().includes(needle) ||
        application.description.toLowerCase().includes(needle),
    );
  }, [applications, query]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Application Board</h1>
          <p className="subtitle">
            {loading ? 'Loading…' : `${visibleApplications.length} of ${applications.length} shown`}
          </p>
        </div>

        <div className="controls">
          <label className="control">
            <span>Search</span>
            <input
              type="search"
              value={query}
              placeholder="Filter by name or description"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <button type="button" className="reload" onClick={reload}>
            Reload
          </button>
        </div>
      </header>

      <main>
        {loading && <p className="state-message">Loading applications…</p>}
        {!loading && error && (
          <p className="state-message error">
            {error} <button type="button" onClick={reload}>Try again</button>
          </p>
        )}
        {!loading && !error && <AppList applications={visibleApplications} />}
      </main>
    </div>
  );
}
