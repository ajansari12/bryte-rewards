import React, { Suspense } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '@/context/AppContext';
import { Sidebar, Topbar, ToastRack, NotifPanel, Confetti } from './Shell';
import { FeedPage } from './Feed';
import { GiveRecognitionModal } from './GiveModal';
import { BRYTE_DATA } from '@/lib/data';
import { Icon } from './Icon';
import { useNotificationSync } from '@/lib/hooks/useNotificationSync';
import { useRealtimeSync } from '@/lib/hooks/useRealtimeSync';
import { useCurrentUser, useCurrentOrg } from '@/lib/queries/users';
import type { Industry, Theme, Route } from '@/lib/types';

// Lazy-load less-critical page components
const LeaderboardPage = React.lazy(() => import('./Pages').then(m => ({ default: m.LeaderboardPage })));
const BadgesPage = React.lazy(() => import('./Pages').then(m => ({ default: m.BadgesPage })));
const RewardsPage = React.lazy(() => import('./Pages').then(m => ({ default: m.RewardsPage })));
const ManagerPage = React.lazy(() => import('./Pages').then(m => ({ default: m.ManagerPage })));
const AnalyticsPage = React.lazy(() => import('./Pages').then(m => ({ default: m.AnalyticsPage })));
const AdminPage = React.lazy(() => import('./Pages').then(m => ({ default: m.AdminPage })));
const ProfilePage = React.lazy(() => import('./Additions').then(m => ({ default: m.ProfilePage })));
const NotificationsPage = React.lazy(() => import('./Extras').then(m => ({ default: m.NotificationsPage })));
const SearchPalette = React.lazy(() => import('./Additions').then(m => ({ default: m.SearchPalette })));
const RecognitionDetail = React.lazy(() => import('./Additions').then(m => ({ default: m.RecognitionDetail })));
const DigestPreview = React.lazy(() => import('./Additions').then(m => ({ default: m.DigestPreview })));
const CoachmarksTour = React.lazy(() => import('./Extras').then(m => ({ default: m.CoachmarksTour })));
const KudosPrintView = React.lazy(() => import('./Extras2').then(m => ({ default: m.KudosPrintView })));
const BadgeNominationModal = React.lazy(() => import('./Extras').then(m => ({ default: m.BadgeNominationModal })));
const DarkModeStyles = React.lazy(() => import('./Extras2').then(m => ({ default: m.DarkModeStyles })));

const titleFor: Record<string, string> = {
  feed: 'Feed', profile: 'My profile', notifications: 'Notifications',
  leaderboard: 'Leaderboard', badges: 'Badges', rewards: 'Rewards',
  manager: 'Team pulse', analytics: 'Analytics', admin: 'Admin', mobile: 'Mobile preview',
};

export function AppShell() {
  const app = useApp();
  const navigate = useNavigate();
  const { notifs, unreadCount, markAllRead } = useNotificationSync();
  useRealtimeSync();
  const { data: dbUser } = useCurrentUser();
  const { data: dbOrg } = useCurrentOrg();

  const pathname = window.location.pathname;
  const routeSegment = pathname.split('/').pop() || 'feed';
  const route = routeSegment as Route;

  const setRoute = (r: Route) => navigate(`/app/${r}`);

  const sidebarIndustry = dbOrg?.industry || app.industry;
  const sidebarUser = dbUser ? {
    name: dbUser.display_name,
    displayName: dbUser.display_name,
    role: dbUser.role,
    title: dbUser.title || (dbUser.role === 'admin' ? 'Admin' : dbUser.role === 'manager' ? 'Manager' : 'Team member'),
    points: dbUser.points,
    initials: (dbUser.display_name || '')
      .split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]!.toUpperCase()).join('') || '—',
  } : undefined;

  return (
    <Suspense fallback={null}>
    <div className="app">
      <Sidebar
        route={route}
        setRoute={setRoute}
        industry={sidebarIndustry}
        orgName={dbOrg?.name}
        orgTag={dbOrg ? `${(BRYTE_DATA.INDUSTRIES[dbOrg.industry]?.name) || 'Team'} · ${dbOrg.plan === 'free' ? 'Free plan' : dbOrg.plan}` : undefined}
        user={sidebarUser}
      />

      <div className="main">
        <Topbar
          title={titleFor[route] || 'Bryte'}
          onRecognize={() => app.setShowModal(true)}
          onToggleTheme={app.toggleTheme}
          theme={app.theme}
          notifications={unreadCount}
          onBell={() => app.setShowNotifPanel(!app.showNotifPanel)}
          showNotifPanel={app.showNotifPanel}
          onSearch={() => app.setShowSearch(true)}
        />

        <div className="content" key={route}>
          {route === 'feed' && (
            <FeedPage
              onRecognize={() => app.setShowModal(true)}
              onOpenRec={app.setDetailRec}
              onCelebrate={(a: any) => app.pushToast({ kind: 'success', msg: `Celebrating ${a.name}'s ${a.years}-year ✦` })}
              onVote={(n: string) => app.pushToast({ kind: 'success', msg: `Voted for ${n.split(' ')[0]} ✦` })}
            />
          )}
          {route === 'profile' && (
            <ProfilePage onRecognize={() => app.setShowModal(true)} onOpenRec={app.setDetailRec} />
          )}
          {route === 'notifications' && (
            <NotificationsPage onOpenRec={app.setDetailRec} />
          )}
          {route === 'leaderboard' && <LeaderboardPage />}
          {route === 'badges' && <BadgesPage onNominate={app.setNominateBadge} />}
          {route === 'rewards' && (
            <RewardsPage onToast={app.pushToast} onConfetti={app.fireConfetti} />
          )}
          {route === 'manager' && (
            <ManagerPage onRecognize={() => app.setShowModal(true)} />
          )}
          {route === 'analytics' && <AnalyticsPage />}
          {route === 'admin' && (
            <AdminPage onToast={app.pushToast} onOpenKudos={() => app.setShowKudos(true)} />
          )}
          {route === 'mobile' && <MobileGalleryPage />}
        </div>
      </div>

      {/* Notification panel */}
      {app.showNotifPanel && (
        <>
          <div className="notif-backdrop" onClick={() => app.setShowNotifPanel(false)} />
          <NotifPanel
            notifs={notifs}
            onClose={() => app.setShowNotifPanel(false)}
            onMarkAll={markAllRead}
            onSeeAll={() => { app.setShowNotifPanel(false); setRoute('notifications'); }}
          />
        </>
      )}

      {app.showModal && (
        <GiveRecognitionModal
          onClose={() => app.setShowModal(false)}
          onDone={() => {
            app.fireConfetti();
            app.pushToast({ kind: 'success', msg: 'Recognition sent ✦' });
          }}
        />
      )}

      {app.showSearch && (
        <SearchPalette
          onClose={() => app.setShowSearch(false)}
          onJump={(r: string) => {
            if (r === '__recognize') app.setShowModal(true);
            else setRoute(r as Route);
          }}
        />
      )}
      {app.detailRec && (
        <RecognitionDetail
          rec={app.detailRec}
          onClose={() => app.setDetailRec(null)}
          onRecognize={() => app.setShowModal(true)}
        />
      )}
      {app.showDigest && <DigestPreview onClose={() => app.setShowDigest(false)} onToast={app.pushToast} />}
      {app.showTour && <CoachmarksTour onDone={() => app.setShowTour(false)} />}
      {app.showKudos && <KudosPrintView onClose={() => app.setShowKudos(false)} />}
      {app.nominateBadge && (
        <BadgeNominationModal
          badge={app.nominateBadge}
          onClose={() => app.setNominateBadge(null)}
          onSent={({ nominee_name }) => app.pushToast({ kind: 'success', msg: `Nomination sent for ${nominee_name.split(' ')[0]} ✦` })}
        />
      )}
      <DarkModeStyles />

      <ToastRack toasts={app.toasts} />
      <Confetti burst={app.confetti} />

      {app.showTweaks && (
        <TweaksPanel
          industry={app.industry}
          onIndustry={app.setIndustry}
          theme={app.theme}
          onTheme={app.toggleTheme}
          onClose={() => app.setShowTweaks(false)}
        />
      )}
    </div>
    </Suspense>
  );
}

// ─── TweaksPanel ─────────────────────────────────────────
interface TweaksPanelProps {
  industry: Industry;
  onIndustry: (i: Industry) => void;
  theme: Theme;
  onTheme: () => void;
  onClose: () => void;
}

function TweaksPanel({ industry, onIndustry, theme, onTheme, onClose }: TweaksPanelProps) {
  const inds = Object.entries(BRYTE_DATA.INDUSTRIES);
  return (
    <div className="tweaks-panel">
      <div className="tweaks-head">
        <div className="title">Tweaks</div>
        <button className="icon-btn" onClick={onClose} style={{ width: 28, height: 28 }}>
          <Icon name="close" size={14} />
        </button>
      </div>
      <div className="tweaks-body">
        <div className="group">
          <label className="group-label">Industry pack</label>
          <div className="tweak-grid">
            {inds.map(([k, v]: [string, any]) => (
              <button key={k} className={'tweak-chip' + (industry === k ? ' active' : '')} onClick={() => onIndustry(k as Industry)}>
                <span>{v.icon}</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="group">
          <label className="group-label">Theme</label>
          <div className="tweak-grid">
            <button className={'tweak-chip' + (theme === 'light' ? ' active' : '')} onClick={theme === 'dark' ? onTheme : undefined}>
              <Icon name="sun" size={14} /> Warm cream
            </button>
            <button className={'tweak-chip' + (theme === 'dark' ? ' active' : '')} onClick={theme === 'light' ? onTheme : undefined}>
              <Icon name="moon" size={14} /> Espresso
            </button>
          </div>
        </div>
        <div style={{ fontSize: 'var(--t-xs)', color: 'var(--b-ink-4)', marginTop: 12, lineHeight: 1.5 }}>
          Theme and industry preferences are remembered on this device.
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Gallery page ─────────────────────────────────
import { MobilePreview, MobileGiveSheet } from './Mobile';

function MobileGalleryPage() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">On the phone</h1>
          <div className="sub">Bottom tab bar, FAB, bottom-sheet recognition flow.</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 48, justifyItems: 'center', paddingTop: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="label" style={{ marginBottom: 16 }}>Feed · bottom tab navigation</div>
          <MobilePreview />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="label" style={{ marginBottom: 16 }}>Give recognition · bottom sheet</div>
          <MobileGiveSheet />
        </div>
      </div>
    </div>
  );
}

export default MobileGalleryPage;
