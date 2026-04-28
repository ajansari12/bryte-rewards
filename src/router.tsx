import { createBrowserRouter, redirect } from 'react-router';
import React, { Suspense } from 'react';
import { requireSession } from '@/lib/auth/requireSession';
import { supabase } from '@/lib/supabase';
import { RouteError } from '@/components/RouteError';

const AuthPage = React.lazy(() =>
  import('@/components/Auth').then(m => ({ default: m.AuthPage }))
);
const OnboardingWizard = React.lazy(() =>
  import('@/components/Auth').then(m => ({ default: m.OnboardingWizard }))
);
const AppShell = React.lazy(() =>
  import('@/components/AppShell').then(m => ({ default: m.AppShell }))
);

function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div aria-busy="true" aria-label="Loading" style={{ minHeight: '100vh' }} />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    loader: async () => { throw redirect('/marketing/Home.html'); },
    element: null,
    errorElement: <RouteError />,
  },
  {
    path: '/login',
    errorElement: <RouteError />,
    async loader() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) throw redirect('/app/feed');
      return null;
    },
    element: (
      <SuspenseWrap>
        <AuthPage mode="login" />
      </SuspenseWrap>
    ),
  },
  {
    path: '/signup',
    errorElement: <RouteError />,
    async loader() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) throw redirect('/app/feed');
      return null;
    },
    element: (
      <SuspenseWrap>
        <AuthPage mode="signup" />
      </SuspenseWrap>
    ),
  },
  {
    path: '/onboarding',
    loader: requireSession,
    errorElement: <RouteError />,
    element: (
      <SuspenseWrap>
        <OnboardingWizard />
      </SuspenseWrap>
    ),
  },
  {
    path: '/app',
    loader: requireSession,
    errorElement: <RouteError />,
    element: (
      <SuspenseWrap>
        <AppShell />
      </SuspenseWrap>
    ),
    children: [
      { index: true, loader: async () => { throw redirect('/app/feed'); } },
      { path: 'feed', errorElement: <RouteError /> },
      { path: 'profile', errorElement: <RouteError /> },
      { path: 'notifications', errorElement: <RouteError /> },
      { path: 'leaderboard', errorElement: <RouteError /> },
      { path: 'badges', errorElement: <RouteError /> },
      { path: 'rewards', errorElement: <RouteError /> },
      { path: 'manager', errorElement: <RouteError /> },
      { path: 'analytics', errorElement: <RouteError /> },
      { path: 'admin', errorElement: <RouteError /> },
      { path: 'mobile', errorElement: <RouteError /> },
    ],
  },
  {
    path: '*',
    loader: async () => { throw redirect('/marketing/Home.html'); },
    element: null,
    errorElement: <RouteError />,
  },
]);
