import { useEffect, useState } from 'react';
import { fetchActivePreset, setActivePreset } from '../api';
import { hrefFor } from '../router';

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

const PRESET_HINTS: Record<string, string> = {
  default: 'Six everyday applications',
  developer: 'Five developer tools',
  media: 'Three media applications',
  empty: 'No applications — the list’s empty state',
  random: 'A different non-empty preset on every request',
};

/** Dev-only page for choosing which preset the main page is served. */
export default function AdminPage() {
  const [presets, setPresets] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchActivePreset(controller.signal)
      .then((response) => {
        setPresets(response.presets);
        setActive(response.activePreset);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause)) return;
        setError(cause instanceof Error ? cause.message : 'Unknown error');
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const choose = async (preset: string) => {
    setSaving(preset);
    setError(null);
    try {
      const response = await setActivePreset(preset);
      setActive(response.activePreset);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unknown error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Admin</h1>
          <p className="subtitle">
            Development only · choose the preset served to the application list
          </p>
        </div>
        <a className="back-link" href={hrefFor('/')}>
          Open the application list →
        </a>
      </header>

      <main>
        {loading && <p className="state-message">Loading…</p>}
        {error && <p className="state-message error">{error}</p>}

        {!loading && (
          <ul className="preset-list">
            {presets.map((preset) => {
              const isActive = preset === active;
              return (
                <li key={preset}>
                  <button
                    type="button"
                    className={`preset${isActive ? ' preset-active' : ''}`}
                    aria-pressed={isActive}
                    disabled={saving !== null}
                    onClick={() => choose(preset)}
                  >
                    <span className="preset-name">{preset}</span>
                    <span className="preset-hint">{PRESET_HINTS[preset] ?? ''}</span>
                    <span className="preset-state">
                      {saving === preset ? 'Saving…' : isActive ? 'Active' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="admin-note">
          The change applies to the next request — reload the application list to see it.
        </p>
      </main>
    </div>
  );
}
