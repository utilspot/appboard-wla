import { withBase } from './base';
import type {
  AdminPresetResponse,
  ApplicationResponse,
  ApplicationsResponse,
} from './types';

/** `path` is app-relative (`/api/...`); the base URL prefix is added here. */
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(withBase(path), init);
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // Response had no JSON body; keep the status-based message.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

/** Applications of the preset currently selected on the admin page. */
export function fetchApplications(
  options: { delayMs?: number; fail?: boolean } = {},
  signal?: AbortSignal,
): Promise<ApplicationsResponse> {
  const params = new URLSearchParams();
  if (options.delayMs) params.set('delay', String(options.delayMs));
  if (options.fail) params.set('fail', '1');
  const query = params.toString();
  return requestJson<ApplicationsResponse>(`/api/applications${query ? `?${query}` : ''}`, {
    signal,
  });
}

/** `slug` is the slug of the entry's title — entries carry no id. */
export function fetchApplication(slug: string, signal?: AbortSignal): Promise<ApplicationResponse> {
  return requestJson<ApplicationResponse>(`/api/applications/${encodeURIComponent(slug)}`, {
    signal,
  });
}

/** Dev-only admin API: these endpoints return 404 in production. */
export function fetchActivePreset(signal?: AbortSignal): Promise<AdminPresetResponse> {
  return requestJson<AdminPresetResponse>('/api/admin/preset', { signal });
}

export function setActivePreset(
  preset: string,
  signal?: AbortSignal,
): Promise<AdminPresetResponse> {
  return requestJson<AdminPresetResponse>('/api/admin/preset', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preset }),
    signal,
  });
}
