import { createBrowserRouter, redirect } from 'react-router';
import React, { Suspense } from 'react';
import { requireSession } from '@/lib/auth/requireSession';
import { supabase } from '@/lib/supabase';

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
  return <Suspense fallback={null}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
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
    element: (
      <SuspenseWrap>
        <OnboardingWizard />
      </SuspenseWrap>
    ),
  },
  {
    path: '/app',
    loader: requireSession,
    element: (
      <SuspenseWrap>
        <AppShell />
      </SuspenseWrap>
    ),
    children: [
      { index: true, loader: async () => { throw redirect('/app/feed'); } },
      { path: 'feed' },
      { path: 'profile' },
      { path: 'notifications' },
      { path: 'leaderboard' },
      { path: 'badges' },
      { path: 'rewards' },
      { path: 'manager' },
      { path: 'analytics' },
      { path: 'admin' },
      { path: 'mobile' },
    ],
  },
  {
    path: '*',
    loader: async () => { throw redirect('/login'); },
    element: null,
  },
]);
