import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { AppProvider } from '@/context/AppContext';
import { router } from '@/router';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
    mutations: { retry: 0 },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Something went wrong';
      window.dispatchEvent(new CustomEvent('bryte:toast', { detail: { kind: 'error', msg } }));
    },
  }),
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
