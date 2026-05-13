import { createBrowserRouter, redirect } from 'react-router';
import React, { Suspense } from 'react';
import {
  requireOnboardedSession,
  requireSessionSkipIfOnboarded,
  redirectIfAuthenticated,
  requireRecoverySession,
} from '@/lib/auth/requireSession';
import { RouteError, ErrorBoundary } from '@/components/RouteError';

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
    loader: async () => {
      if (typeof window !== 'undefined') {
        window.location.replace('/home.html');
        return null;
      }
      throw redirect('/home.html');
    },
    element: null,
    errorElement: <RouteError />,
  },
  {
    path: '/login',
    errorElement: <RouteError />,
    loader: redirectIfAuthenticated,
    element: (
      <SuspenseWrap>
        <AuthPage mode="login" />
      </SuspenseWrap>
    ),
  },
  {
    path: '/signup',
    errorElement: <RouteError />,
    loader: redirectIfAuthenticated,
    element: (
      <SuspenseWrap>
        <AuthPage mode="signup" />
      </SuspenseWrap>
    ),
  },
  {
    path: '/forgot-password',
    errorElement: <RouteError />,
    element: (
      <SuspenseWrap>
        <AuthPage mode="forgot" />
      </SuspenseWrap>
    ),
  },
  {
    path: '/reset-password',
    errorElement: <RouteError />,
    loader: requireRecoverySession,
    element: (
      <SuspenseWrap>
        <AuthPage mode="reset" />
      </SuspenseWrap>
    ),
  },
  {
    path: '/onboarding',
    loader: requireSessionSkipIfOnboarded,
    errorElement: <RouteError />,
    element: (
      <SuspenseWrap>
        <OnboardingWizard />
      </SuspenseWrap>
    ),
  },
  {
    path: '/app',
    loader: requireOnboardedSession,
    errorElement: <RouteError />,
    element: (
      <ErrorBoundary>
        <SuspenseWrap>
          <AppShell />
        </SuspenseWrap>
      </ErrorBoundary>
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
    loader: async () => {
      throw new Response('Not Found', { status: 404 });
    },
    element: null,
    errorElement: <RouteError />,
  },
]);
