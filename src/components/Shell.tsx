import { useState, useMemo } from 'react';
import { Icon } from './Icon';
import { supabase } from '@/lib/supabase';
import { useBadges } from '@/lib/queries/badges';
import { useMyRecognitions } from '@/lib/queries/recognitions';
import type { Toast, Notification, Route } from '@/lib/types';

// ─── Types ────────────────────────────────────────────

interface SidebarProps {
  route: Route;
  setRoute: (route: Route) => void;
  industry: string;
  orgName?: string;
  orgTag?: string;
  user?: {
    name: string;
    displayName: string;
    role: string;
    title: string;
    points: number;
    initials: string;
  };
}

interface TopbarProps {
  title: string;
  crumb?: string;
  onRecognize: () => void;
  onToggleTheme: () => void;
  theme: string;
  notifications: number;
  onBell: () => void;
  showNotifPanel: boolean;
  onSearch: () => void;
}

interface NotifPanelProps {
  onClose: () => void;
  notifs: Notification[];
  onMarkAll: () => void;
  onSeeAll: () => void;
  onItemClick?: (n: Notification) => void;
}

// ─── Sidebar ─────────────────────────────────────────
export function Sidebar({ route, setRoute, orgName: orgNameProp, orgTag: orgTagProp, user }: SidebarProps) {
  const me = user;
  const [showCtx, setShowCtx] = useState(false);
  const { data: allBadges = [] } = useBadges();
  const { data: myRecs = [] } = useMyRecognitions();

  const earnedBadgesCount = allBadges.filter(b => b.awarded_at !== null).length;

  const streakDays = useMemo(() => {
    if (myRecs.length === 0) return 0;
    const days = new Set(
      myRecs.map(r => new Date(r.created_at).toISOString().slice(0, 10))
    );
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [myRecs]);

  const navItems = [
    { id: 'feed', label: 'Recognition feed', icon: 'feed' },
    { id: 'profile', label: 'My profile', icon: 'users' },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'trophy' },
    { id: 'badges', label: 'Badges', icon: 'badge' },
    { id: 'rewards', label: 'Rewards', icon: 'gift' },
  ];
  const role = me?.role ?? 'employee';
  const teamItems = [
    { id: 'manager', label: 'Team pulse', icon: 'users' },
    { id: 'analytics', label: 'Analytics', icon: 'chart' },
    { id: 'admin', label: 'Settings & admin', icon: 'shield' },
  ].filter(item => {
    if (item.id === 'manager' || item.id === 'analytics') return role === 'manager' || role === 'admin';
    if (item.id === 'admin') return role === 'admin';
    return true;
  });
  const orgName = orgNameProp || 'Bryte';
  const orgTag = orgTagProp ?? '';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="wordmark">
          Bryte<span className="dot">.</span>
          <span className="suffix">Rewards</span>
        </div>
        <div className="org" title={orgTag}>{orgName}</div>
      </div>

      <div className="nav-section">
        <div className="nav-section-label">Your work</div>
        {navItems.map(item => (
          <div key={item.id}
            className={'nav-item' + (route === item.id ? ' active' : '')}
            onClick={() => setRoute(item.id as Route)}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </div>
        ))}

        <div className="nav-section-label" style={{marginTop: 14}}>Team</div>
        {teamItems.map(item => (
          <div key={item.id}
            className={'nav-item' + (route === item.id ? ' active' : '')}
            onClick={() => setRoute(item.id as Route)}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-foot">
        {me && (
        <div className="sidebar-user" style={{cursor: 'pointer', position: 'relative'}}
          onClick={() => setShowCtx(s => !s)}
          onMouseLeave={() => setShowCtx(false)}>
          <div className={`avatar md role-${me.role}`}>{me.initials}</div>
          <div className="meta">
            <div className="name">{me.displayName}</div>
            <div className="role">{me.title}</div>
          </div>
          <button className="icon-btn" style={{width: 24, height: 24}} aria-label={showCtx ? 'Close user menu' : 'Open user menu'} aria-expanded={showCtx}>
            <Icon name={showCtx ? 'up' : 'down'} size={13} stroke={2.5}/>
          </button>

          {showCtx && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 6,
              background: 'var(--b-card)', border: '1px solid var(--b-border)',
              borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-md)',
              padding: 14, zIndex: 50,
              animation: 'page-in 150ms var(--ease)',
            }}>
              {/* Mini profile */}
              <div style={{textAlign: 'center', paddingBottom: 14, borderBottom: '1px solid var(--b-border-soft)', marginBottom: 12}}>
                <div className={`avatar xl role-${me.role}`} style={{margin: '0 auto 10px'}}>{me.initials}</div>
                <div className="serif" style={{fontWeight: 600, color: 'var(--b-ink)', fontSize: '1rem'}}>{me.displayName}</div>
                <div className="muted" style={{fontSize: 'var(--t-xs)', marginTop: 2}}>{me.title}</div>
                <div style={{marginTop: 10, display: 'flex', justifyContent: 'center', gap: 20}}>
                  <div style={{textAlign: 'center'}}>
                    <div className="mono" style={{fontWeight: 700, color: 'var(--b-gold)', fontSize: '1.1rem'}}>{me.points.toLocaleString()}</div>
                    <div className="label" style={{fontSize: 9}}>pts</div>
                  </div>
                  <div style={{textAlign: 'center'}}>
                    <div className="mono" style={{fontWeight: 700, color: 'var(--b-forest)', fontSize: '1.1rem'}}>{earnedBadgesCount}</div>
                    <div className="label" style={{fontSize: 9}}>badges</div>
                  </div>
                  <div style={{textAlign: 'center'}}>
                    <div className="mono" style={{fontWeight: 700, color: 'var(--b-ink)', fontSize: '1.1rem'}}>{streakDays}d</div>
                    <div className="label" style={{fontSize: 9}}>streak</div>
                  </div>
                </div>
              </div>
              <button className="nav-item" style={{width: '100%', margin: 0, borderRadius: 'var(--r-md)'}} onClick={() => setRoute('badges' as Route)}>
                <Icon name="badge" size={14}/> My badges
              </button>
              <button className="nav-item" style={{width: '100%', margin: 0, borderRadius: 'var(--r-md)'}} onClick={() => setRoute('rewards' as Route)}>
                <Icon name="gift" size={14}/> My rewards
              </button>
              <div style={{height: 1, background: 'var(--b-border-soft)', margin: '8px 0'}}/>
              <button
                className="nav-item"
                style={{width: '100%', margin: 0, color: 'var(--b-terra)', borderRadius: 'var(--r-md)'}}
                onClick={async () => { await supabase.auth.signOut(); }}
              >
                <Icon name="arrow" size={14}/> Sign out
              </button>
            </div>
          )}
        </div>
        )}
      </div>
    </aside>
  );
}

// ─── Notification Panel ───────────────────────────────
export function NotifPanel({ onClose, notifs, onMarkAll, onSeeAll, onItemClick }: NotifPanelProps) {
  const typeIcon: Record<string, string> = { received: '✦', reaction: '❤️', badge: '🏅', milestone: '🎉' };
  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
      background: 'var(--b-card)', borderLeft: '1px solid var(--b-border)',
      boxShadow: '-8px 0 32px rgba(28,20,16,0.10)',
      zIndex: 80, display: 'flex', flexDirection: 'column',
      animation: 'notif-slide-in 250ms var(--ease)',
    }}>
      <style>{`@keyframes notif-slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      {/* Header */}
      <div style={{padding: '20px 20px 16px', borderBottom: '1px solid var(--b-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0}}>
        <div className="h3">Notifications</div>
        <div className="row" style={{gap: 6}}>
          <button className="btn-text btn-sm" style={{fontSize: 'var(--t-xs)'}} onClick={onMarkAll}>Mark all read</button>
          <button className="icon-btn" onClick={onClose} aria-label="Close notifications"><Icon name="close" size={16}/></button>
        </div>
      </div>

      {/* List */}
      <div style={{flex: 1, overflowY: 'auto', padding: '10px 0'}}>
        {notifs.map((n, i) => (
          <div key={n.id} style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--b-border-soft)',
            background: n.read ? 'transparent' : 'var(--b-gold-pale)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
            cursor: 'pointer', transition: 'background 120ms var(--ease)',
            animation: `notif-item-in 200ms ${i * 50}ms var(--ease-spring) both`,
          }}
          onClick={() => onItemClick?.(n)}
          onMouseEnter={e => { if (n.read) (e.currentTarget as HTMLDivElement).style.background = 'var(--b-elevated)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.read ? 'transparent' : 'var(--b-gold-pale)'; }}>
            <style>{`@keyframes notif-item-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: none; } }`}</style>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: n.read ? 'var(--b-surface)' : 'var(--b-gold-pale)',
              border: `1px solid ${n.read ? 'var(--b-border)' : 'var(--b-gold-border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>
              {typeIcon[n.type] || '★'}
            </div>
            <div className="grow">
              <div style={{fontSize: '0.875rem', fontWeight: n.read ? 500 : 600, color: 'var(--b-ink)', lineHeight: 1.3, marginBottom: 3}}>
                {n.msg}
              </div>
              <div style={{fontSize: 'var(--t-xs)', color: 'var(--b-ink-3)', lineHeight: 1.5}}>
                {n.sub}
              </div>
              <div style={{fontSize: 'var(--t-xs)', color: 'var(--b-ink-4)', marginTop: 4}}>{n.time}</div>
            </div>
            {!n.read && <div style={{width: 7, height: 7, borderRadius: '50%', background: 'var(--b-gold)', marginTop: 5, flexShrink: 0}}/>}
          </div>
        ))}
      </div>

      {/* Footer — See all */}
      <div style={{padding: '12px 20px', borderTop: '1px solid var(--b-border-soft)', flexShrink: 0}}>
        <button className="btn btn-ghost btn-block btn-sm" onClick={onSeeAll}>See all notifications →</button>
      </div>
    </div>
  );
}

// ─── Topbar ──────────────────────────────────────────
export function Topbar({ title, crumb, onRecognize, onToggleTheme, theme, notifications, onBell, showNotifPanel, onSearch }: TopbarProps) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">{title}</div>
        {crumb && <><span className="muted">/</span><span className="topbar-crumbs">{crumb}</span></>}
      </div>
      <div className="topbar-right">
        <button className="topbar-search" onClick={onSearch} title="Search (⌘K)">
          <Icon name="search" size={14}/>
          <span>Search…</span>
          <kbd>⌘K</kbd>
        </button>
        <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <button
          className="icon-btn"
          onClick={onBell}
          title="Notifications"
          aria-label={notifications > 0 ? `Notifications, ${notifications} unread` : 'Notifications'}
          aria-expanded={showNotifPanel}
          style={{
            background: showNotifPanel ? 'var(--b-gold-pale)' : 'transparent',
            color: showNotifPanel ? 'var(--b-gold)' : 'var(--b-ink-3)',
            borderRadius: 'var(--r-md)',
          }}
        >
          <Icon name="bell" />
          {notifications > 0 && <span className="bell-badge" key={notifications} aria-hidden="true">{notifications}</span>}
        </button>
        <button className="btn btn-celebrate" onClick={onRecognize}>
          <span style={{fontSize: 14}}>✦</span> Recognise someone
        </button>
      </div>
    </div>
  );
}

// ─── Toast rack ──────────────────────────────────────
export function ToastRack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-rack">
      {toasts.map(t => (
        <div key={t.id} className={'toast ' + (t.kind || 'success')}>
          <span className="ico">
            {t.kind === 'error' ? '!' : t.kind === 'info' ? '★' : '✓'}
          </span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Confetti burst ──────────────────────────────────
export function Confetti({ burst }: { burst: number }) {
  if (!burst) return null;
  const pieces = useMemo(() => {
    const arr: {
      id: number;
      color: string;
      size: number;
      shape: string;
      dx: number;
      dy: number;
      rot: number;
      delay: number;
    }[] = [];
    const colors = ['#C2882D','#C2882D','#E8B86D','#FAF6EF','#FAF6EF','#D05A3B','#2C5F4A'];
    for (let i = 0; i < 60; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.9;
      const dist = 180 + Math.random() * 280;
      arr.push({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 5 + Math.random() * 6,
        shape: Math.random() < 0.5 ? 'circle' : 'square',
        dx: Math.sin(angle) * dist * (Math.random() < 0.5 ? -1 : 1),
        dy: -Math.abs(Math.cos(angle)) * dist - Math.random() * 80,
        rot: Math.random() * 720 - 360,
        delay: Math.random() * 80,
      });
    }
    return arr;
  }, [burst]);

  return (
    <div className="confetti-stage">
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece" style={{
          left: `calc(50% - ${p.size/2}px)`, top: '45%',
          width: p.size, height: p.size,
          background: p.color,
          borderRadius: p.shape === 'circle' ? '50%' : 2,
          animation: `confetti-fly 1300ms cubic-bezier(0.2,0.6,0.4,1) ${p.delay}ms forwards`,
          ['--dx' as string]: `${p.dx}px`,
          ['--dy' as string]: `${p.dy}px`,
          ['--rot' as string]: `${p.rot}deg`,
        }}/>
      ))}
      <style>{`
        @keyframes confetti-fly {
          0% { transform: translate(0,0) rotate(0); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(var(--dx), calc(var(--dy) + 350px)) rotate(var(--rot)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

