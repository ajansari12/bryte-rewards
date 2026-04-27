'use client';

import dynamic from 'next/dynamic';
import { useApp } from '@/context/AppContext';
import { Confetti } from '@/components/Shell';

// Lazy-load heavy components to keep initial bundle small
const AppShell = dynamic(() => import('@/components/AppShell').then(m => ({ default: m.AppShell })), { ssr: false });
const AuthPage = dynamic(() => import('@/components/Auth').then(m => ({ default: m.AuthPage })), { ssr: false });
const OnboardingWizard = dynamic(() => import('@/components/Auth').then(m => ({ default: m.OnboardingWizard })), { ssr: false });

export default function Home() {
  const app = useApp();

  if (app.screen === 'login' || app.screen === 'signup') {
    return (
      <>
        <AuthPage mode={app.screen} onDone={(next: string) => app.setScreen(next as any)} />
        <Confetti burst={app.confetti} />
      </>
    );
  }

  if (app.screen === 'onboarding') {
    return (
      <>
        <OnboardingWizard
          industry={app.industry}
          onSetIndustry={(i: string) => app.setIndustry(i as any)}
          onComplete={() => { app.fireConfetti(); app.setScreen('app'); }}
        />
        <Confetti burst={app.confetti} />
      </>
    );
  }

  return <AppShell />;
}
