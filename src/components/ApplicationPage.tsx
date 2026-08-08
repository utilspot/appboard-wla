import { useEffect, useState } from 'react';
import { fetchApplication } from '../api';
import { hrefFor, useLinkHandler } from '../router';
import type { Application } from '../types';
import AppIcon from './AppIcon';

interface ApplicationPageProps {
  /** Slug of the application's title, from the /apps/<slug> route. */
  slug: string;
}

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

export default function ApplicationPage({ slug }: ApplicationPageProps) {
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onBackClick = useLinkHandler('/');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchApplication(slug, controller.signal)
      .then((response) => {
        setApplication(response.application);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause)) return;
        setError(cause instanceof Error ? cause.message : 'Unknown error');
        setApplication(null);
        setLoading(false);
      });

    return () => controller.abort();
  }, [slug]);

  return (
    <div className="page">
      <a className="back-link" href={hrefFor('/')} onClick={onBackClick}>
        ← All applications
      </a>

      {loading && <p className="state-message">Loading application…</p>}
      {!loading && error && <p className="state-message error">{error}</p>}

      {!loading && !error && application && (
        <article className="app-detail">
          <header className="app-detail-header">
            <AppIcon icon={application.icon} title={application.title} />
            <div>
              <h1>{application.title}</h1>
              {application.version && (
                <p className="app-detail-version">Version {application.version}</p>
              )}
            </div>
          </header>
          <p className="app-detail-description">{application.description}</p>
          {application.main && (
            <p className="app-detail-actions">
              <a className="open-link" href={application.main}>
                Open {application.title}
              </a>
            </p>
          )}
        </article>
      )}
    </div>
  );
}
