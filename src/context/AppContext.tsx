import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BRYTE_DATA, SAMPLE_NOTIFS } from '@/lib/data';
import type { Recognition, Notification, Toast, Route, Screen, Theme, Industry } from '@/lib/types';

interface AppState {
  screen: Screen;
  industry: Industry;
  theme: Theme;
  route: Route;
  recs: Recognition[];
  newIds: Set<string>;
  showModal: boolean;
  toasts: Toast[];
  confetti: number;
  notifs: Notification[];
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
  setScreen: (s: Screen) => void;
  setIndustry: (i: Industry) => void;
  toggleTheme: () => void;
  setRoute: (r: Route) => void;
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
  handleSubmitRec: (rec: Omit<Recognition, '_id'>) => void;
  markAllRead: () => void;
  setNotifs: (fn: (prev: Notification[]) => Notification[]) => void;
}

const AppContext = createContext<(AppState & AppActions) | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreenState] = useState<Screen>('login');
  const [industry, setIndustryState] = useState<Industry>('healthcare');
  const [theme, setTheme] = useState<Theme>('light');
  const [route, setRoute] = useState<Route>('feed');
  const [recs, setRecs] = useState<Recognition[]>(() => {
    const pack = BRYTE_DATA.INDUSTRIES.healthcare;
    return pack.sampleRecs.map((r, i) => ({ ...r, _id: `seed-${i}` }));
  });
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confetti, setConfetti] = useState(0);
  const [notifs, setNotifs] = useState<Notification[]>(SAMPLE_NOTIFS as Notification[]);
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
      const savedScreen = localStorage.getItem('bryte-screen') as Screen;
      if (savedScreen) setScreenState(savedScreen);
    } catch {}
  }, []);

  // Show tour on first app entry
  useEffect(() => {
    if (screen === 'app') {
      try {
        if (!localStorage.getItem('bryte.tour.v1')) {
          const t = setTimeout(() => setShowTour(true), 1200);
          return () => clearTimeout(t);
        }
      } catch {}
    }
  }, [screen]);

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

  // Persist screen
  useEffect(() => {
    try { localStorage.setItem('bryte-screen', screen); } catch {}
  }, [screen]);

  const persist = (obj: Record<string, string>) => {
    try { localStorage.setItem('bryte-tweaks', JSON.stringify(obj)); } catch {}
  };

  const setScreen = useCallback((s: Screen) => {
    setScreenState(s);
  }, []);

  const setIndustry = useCallback((ind: Industry) => {
    setIndustryState(ind);
    const pack = BRYTE_DATA.INDUSTRIES[ind];
    setRecs(pack.sampleRecs.map((r, i) => ({ ...r, _id: `${ind}-${i}` })));
    setNewIds(new Set());
    persist({ industry: ind, theme });
  }, [theme]);

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

  const handleSubmitRec = useCallback((rec: Omit<Recognition, '_id'>) => {
    const newRec: Recognition = { ...rec, _id: `new-${Date.now()}` };
    setRecs(s => [newRec, ...s]);
    setNewIds(s => new Set([...s, newRec._id!]));
    setShowModal(false);
    fireConfetti();
    pushToast({ kind: 'success', msg: `Sent. ✦ ${rec.recipient.split(' ')[0]}'s been notified.` });
    setNotifs(n => [{
      id: Date.now(),
      type: 'received',
      msg: `${rec.recipient.split(' ')[0]} will receive your recognition`,
      sub: `"${rec.message.slice(0, 60)}…" · +${rec.points} pts`,
      time: 'Just now',
      read: false,
    } as Notification, ...n]);
    setTimeout(() => setNewIds(s => { const n = new Set(s); n.delete(newRec._id!); return n; }), 2500);
    setRoute('feed');
  }, [fireConfetti, pushToast]);

  const markAllRead = useCallback(() => {
    setNotifs(n => n.map(x => ({ ...x, read: true })));
  }, []);

  return (
    <AppContext.Provider value={{
      screen, industry, theme, route, recs, newIds, showModal, toasts, confetti,
      notifs, showNotifPanel, showTweaks, showSearch, detailRec, showDigest,
      nudgePerson, showTour, showKudos, nominateBadge,
      setScreen, setIndustry, toggleTheme, setRoute, setShowModal,
      setShowNotifPanel, setShowTweaks, setShowSearch, setDetailRec,
      setShowDigest, setNudgePerson, setShowTour, setShowKudos, setNominateBadge,
      pushToast, fireConfetti, handleSubmitRec, markAllRead, setNotifs,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
