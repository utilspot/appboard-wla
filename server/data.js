/**
 * Mock application sets used by the test server.
 *
 * `version` is optional: `notes`, `api-client` and `podcasts` deliberately omit
 * it, so the page's "no version, no version label" path stays covered. The same
 * three omit `main`, which keeps the built-in detail page reachable — an entry
 * that has a `main` link is opened directly instead.
 *
 * `main` is where choosing the application takes the user. Here it points at
 * this server's stand-in launch pages; a real board points it at each
 * application's own URL.
 *
 * `icon` is a root-relative link to an icon image, served by this same server
 * from `server/public/icons/`.
 *
 * `id` is internal: it addresses an entry in `/api/applications/<id>` but is
 * stripped from the JSON, so clients address entries by the slug of their
 * title instead — which `findApplication` also accepts.
 */

export const applicationSets = {
  default: [
    {
      id: 'mail',
      title: 'Mail',
      version: '0.0.1',
      description: 'Read, write and organize your email across every account.',
      icon: '/icons/mail.svg',
      main: '/launch/mail',
    },
    {
      id: 'calendar',
      title: 'Calendar',
      version: '2.4.0',
      description: 'Plan meetings, track deadlines and share schedules with your team.',
      icon: '/icons/calendar.svg',
      main: '/launch/calendar',
    },
    {
      id: 'drive',
      title: 'Drive',
      version: '1.12.3',
      description: 'Store files in the cloud and sync them between all your devices.',
      icon: '/icons/drive.svg',
      main: '/launch/drive',
    },
    {
      id: 'notes',
      title: 'Notes',
      description: 'Capture ideas as markdown notes with instant full-text search.',
      icon: '/icons/notes.svg',
    },
    {
      id: 'chat',
      title: 'Chat',
      version: '3.0.0-beta.2',
      description: 'Group channels, direct messages and calls in a single window.',
      icon: '/icons/chat.svg',
      main: '/launch/chat',
    },
    {
      id: 'photos',
      title: 'Photos',
      version: '5.1.0',
      description: 'Automatic backup, albums and search by people, places and things.',
      icon: '/icons/photos.svg',
      main: '/launch/photos',
    },
  ],

  developer: [
    {
      id: 'code-editor',
      title: 'Code Editor',
      version: '1.88.1',
      description: 'Lightweight editor with LSP support, git integration and extensions.',
      icon: '/icons/code-editor.svg',
      main: '/launch/code-editor',
    },
    {
      id: 'terminal',
      title: 'Terminal',
      version: '0.9.7',
      description: 'GPU-accelerated terminal emulator with split panes and profiles.',
      icon: '/icons/terminal.svg',
      main: '/launch/terminal',
    },
    {
      id: 'api-client',
      title: 'API Client',
      description: 'Compose HTTP requests, inspect responses and save them as collections.',
      icon: '/icons/api-client.svg',
    },
    {
      id: 'db-studio',
      title: 'DB Studio',
      version: '4.2.0',
      description: 'Browse tables, run SQL and visualise schemas for Postgres and MySQL.',
      icon: '/icons/db-studio.svg',
      main: '/launch/db-studio',
    },
    {
      id: 'ci-monitor',
      title: 'CI Monitor',
      version: '2.0.1',
      description: 'Live pipeline status, build logs and failure notifications.',
      icon: '/icons/ci-monitor.svg',
      main: '/launch/ci-monitor',
    },
  ],

  media: [
    {
      id: 'music',
      title: 'Music',
      version: '7.3.2',
      description: 'Stream your library, build playlists and follow new releases.',
      icon: '/icons/music.svg',
      main: '/launch/music',
    },
    {
      id: 'video-editor',
      title: 'Video Editor',
      version: '1.5.0',
      description: 'Multi-track timeline editing with transitions, titles and export presets.',
      icon: '/icons/video-editor.svg',
      main: '/launch/video-editor',
    },
    {
      id: 'podcasts',
      title: 'Podcasts',
      description: 'Subscribe to shows, download episodes and resume playback anywhere.',
      icon: '/icons/podcasts.svg',
    },
  ],

  // Deliberately empty, for testing the empty state of the list.
  empty: [],
};

export const setNames = Object.keys(applicationSets);

/** 'Code Editor' -> 'code-editor'. Shared with the client (src/slug.ts). */
export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Looks an application up by id — or by the slug of its title — across every set. */
export function findApplication(idOrSlug) {
  for (const applications of Object.values(applicationSets)) {
    const match = applications.find(
      (application) => application.id === idOrSlug || slugify(application.title) === idOrSlug,
    );
    if (match) return match;
  }
  return undefined;
}
