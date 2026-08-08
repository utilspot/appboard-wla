import { useCallback, useEffect, useState } from 'react';
import { BASE_URL, withBase } from './base';

/**
 * Routes are written base-relative (`/`, `/apps/mail`); the base URL prefix is
 * added when they reach the browser and stripped when they come back from it.
 */
export const hrefFor = (route: string): string => withBase(route);

/** Location pathname -> route, i.e. with the base URL prefix removed. */
function routeFromLocation(): string {
  const { pathname } = window.location;
  if (!BASE_URL) return pathname;
  if (pathname === BASE_URL) return '/';
  return pathname.startsWith(`${BASE_URL}/`) ? pathname.slice(BASE_URL.length) : pathname;
}

/** Pushes a route onto the history stack and notifies the router. */
export function navigate(route: string) {
  const href = hrefFor(route);
  if (href === window.location.pathname) return;
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}

/** Current route, kept in sync with back/forward navigation. */
export function useRoute(): string {
  const [route, setRoute] = useState(routeFromLocation);

  useEffect(() => {
    const onPopState = () => setRoute(routeFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return route;
}

/**
 * Click handler for in-app links: navigates client-side for plain left clicks
 * and leaves modified clicks (new tab, new window, download) to the browser.
 */
export function useLinkHandler(route: string) {
  return useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(route);
    },
    [route],
  );
}

/** `/apps/<slug>` -> `<slug>`, anything else -> null (the list page). */
export function applicationSlugFromRoute(route: string): string | null {
  const match = /^\/apps\/([^/]+)\/?$/.exec(route);
  return match ? decodeURIComponent(match[1]) : null;
}
