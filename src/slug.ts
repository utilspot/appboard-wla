/**
 * 'Code Editor' -> 'code-editor'.
 *
 * Entries carry no id in the API, so their title's slug is what addresses them
 * in routes and in `/api/applications/<slug>`. Mirrors `slugify` in
 * server/data.js.
 */
export const slugify = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
