import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    // Upload source maps to Sentry only when SENTRY_AUTH_TOKEN is present (CI)
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT ?? 'bryte-rewards',
            authToken: process.env.SENTRY_AUTH_TOKEN,
            telemetry: false,
          }),
        ]
      : []),
  ],
  server: {
    port: 3000,
  },
  build: {
    sourcemap: true,
  },
});
