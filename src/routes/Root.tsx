import React, { Suspense } from 'react';
import { useApp } from '@/context/AppContext';
import { Confetti } from '@/components/Shell';

const AppShell = React.lazy(() =>
  import('@/components/AppShell').then(m => ({ default: m.AppShell }))
);
const AuthPage = React.lazy(() =>
  import('@/components/Auth').then(m => ({ default: m.AuthPage }))
);
const OnboardingWizard = React.lazy(() =>
  import('@/components/Auth').then(m => ({ default: m.OnboardingWizard }))
);

export function Root() {
  const app = useApp();

  if (app.screen === 'login' || app.screen === 'signup') {
    return (
      <Suspense fallback={null}>
        <AuthPage mode={app.screen} onDone={(next: string) => app.setScreen(next as any)} />
        <Confetti burst={app.confetti} />
      </Suspense>
    );
  }

  if (app.screen === 'onboarding') {
    return (
      <Suspense fallback={null}>
        <OnboardingWizard
          industry={app.industry}
          onSetIndustry={(i: string) => app.setIndustry(i as any)}
          onComplete={() => { app.fireConfetti(); app.setScreen('app'); }}
        />
        <Confetti burst={app.confetti} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <AppShell />
    </Suspense>
  );
}
