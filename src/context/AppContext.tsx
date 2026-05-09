import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BRYTE_DATA } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import type { Toast, Theme, Industry, Recognition } from '@/lib/types';

interface AppState {
  industry: Industry;
  theme: Theme;
  showModal: boolean;
  toasts: Toast[];
  confetti: number;
  showNotifPanel: boolean;
  showTweaks: boolean;
  showSearch: boolean;
  detailRec: Recognition | null;
  showDigest: boolean;
  nudgePerson: string | null;
  showTour: boolean;
  showKudos: boolean;
  nominateBadge: { name: string; icon: string; criteria?: string } | null;
}

interface AppActions {
  setIndustry: (i: Industry) => void;
  toggleTheme: () => void;
  setShowModal: (v: boolean) => void;
  setShowNotifPanel: (v: boolean) => void;
  setShowTweaks: (v: boolean) => void;
  setShowSearch: (v: boolean) => void;
  setDetailRec: (r: Recognition | null) => void;
  setShowDigest: (v: boolean) => void;
  setNudgePerson: (p: string | null) => void;
  setShowTour: (v: boolean) => void;
  setShowKudos: (v: boolean) => void;
  setNominateBadge: (b: { name: string; icon: string; criteria?: string } | null) => void;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  fireConfetti: () => void;
}

const AppContext = createContext<(AppState & AppActions) | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [industry, setIndustryState] = useState<Industry>('healthcare');
  const [theme, setTheme] = useState<Theme>('light');
  const [showModal, setShowModal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confetti, setConfetti] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showTweaks, setShowTweaks] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [detailRec, setDetailRec] = useState<Recognition | null>(null);
  const [showDigest, setShowDigest] = useState(false);
  const [nudgePerson, setNudgePerson] = useState<string | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [showKudos, setShowKudos] = useState(false);
  const [nominateBadge, setNominateBadge] = useState<{ name: string; icon: string; criteria?: string } | null>(null);

  // Load persisted prefs on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bryte-tweaks') || '{}');
      if (saved.industry) setIndustryState(saved.industry as Industry);
      if (saved.theme) setTheme(saved.theme as Theme);
    } catch {}
  }, []);

  // Show tour on first app entry
  useEffect(() => {
    try {
      if (!localStorage.getItem('bryte.tour.v1')) {
        const t = setTimeout(() => setShowTour(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(s => !s);
      } else if (
        e.key === 'r' && !e.metaKey && !e.ctrlKey &&
        (document.activeElement as HTMLElement)?.tagName !== 'INPUT' &&
        (document.activeElement as HTMLElement)?.tagName !== 'TEXTAREA'
      ) {
        setShowModal(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Sync theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auth state listener — redirect to /login on sign-out
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = '/login';
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const persist = (obj: Record<string, string>) => {
    try { localStorage.setItem('bryte-tweaks', JSON.stringify(obj)); } catch {}
  };

  const setIndustry = useCallback((ind: Industry) => {
    setIndustryState(ind);
    persist({ industry: ind, theme: '' });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(t => {
      const next = t === 'light' ? 'dark' : 'light';
      persist({ industry, theme: next });
      return next;
    });
  }, [industry]);

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts(s => [...s, { id, ...t }]);
    setTimeout(() => setToasts(s => s.filter(x => x.id !== id)), 4200);
  }, []);

  const fireConfetti = useCallback(() => setConfetti(c => c + 1), []);

  // Global toast bus — listens for CustomEvent('bryte:toast') from mutation errors
  useEffect(() => {
    const h = (e: Event) => {
      const detail = (e as CustomEvent).detail as Omit<Toast, 'id'> | undefined;
      if (detail?.msg) pushToast(detail);
    };
    window.addEventListener('bryte:toast', h);
    return () => window.removeEventListener('bryte:toast', h);
  }, [pushToast]);

  return (
    <AppContext.Provider value={{
      industry, theme, showModal, toasts, confetti,
      showNotifPanel, showTweaks, showSearch, detailRec, showDigest,
      nudgePerson, showTour, showKudos, nominateBadge,
      setIndustry, toggleTheme, setShowModal,
      setShowNotifPanel, setShowTweaks, setShowSearch, setDetailRec,
      setShowDigest, setNudgePerson, setShowTour, setShowKudos, setNominateBadge,
      pushToast, fireConfetti,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// Keep BRYTE_DATA accessible for components still using industry pack metadata
export { BRYTE_DATA };

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
