import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import * as Sentry from '@sentry/react';
import { AppProvider } from '@/context/AppContext';
import { router } from '@/router';
import './styles/globals.css';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
    mutations: { retry: 0 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
