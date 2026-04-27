import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProvider } from '@/context/AppContext';
import { Root } from '@/routes/Root';

// Stub Supabase so the test doesn't need real env vars
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
    from: vi.fn(() => ({ select: vi.fn() })),
  },
}));

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '*', element: <Root /> }]);
  return render(
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </QueryClientProvider>
  );
}

describe('App smoke test', () => {
  it('renders the auth screen on initial load', async () => {
    renderApp();
    // AppContext defaults to 'login' screen; AuthPage renders this heading
    expect(await screen.findByText('Welcome back.')).toBeInTheDocument();
  });
});
