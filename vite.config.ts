import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import manifest from './tools/manifest-plugin';
import { resolveBaseUrl, toViteBase } from './server/base-url.js';

// The dev server is not started by Vite directly: `server/index.js` runs Vite
// in middleware mode so the page and the API share a single port.
export default defineConfig(({ mode }) => {
  const isDevBuild = mode !== 'production';

  const input: Record<string, string> = { index: 'index.html' };
  // The admin page is a development affordance, so it is only built by
  // `npm run build:dev` (`vite build --mode development`).
  if (isDevBuild) input.admin = 'admin.html';

  return {
    // `npm run build --base-url=/123` builds the page for /123/.
    base: toViteBase(resolveBaseUrl()),
    plugins: [
      react(),
      // Writes dist/manifest.json describing the build: its base URL, entry
      // pages and every shipped file with the URL it is served from.
      manifest({
        // `name`, and each entry's `version` and `description`, are omitted
        // on purpose: they come from package.json.
        entries: [
          {
            title: 'Application Board',
            icons: [
              { file: 'favicon.svg', colorScheme: 'light' },
              { file: 'favicon.svg', colorScheme: 'dark' },
            ],
          },
        ],
      }),
    ],
    build: {
      // Emit the hashed JS/CSS next to index.html instead of into dist/assets/.
      assetsDir: '',
      rollupOptions: { input },
    },
  };
});
