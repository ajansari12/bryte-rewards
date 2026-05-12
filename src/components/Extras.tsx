import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from './Icon';
import type { Recognition } from '@/lib/types';
import { useCurrentUser, useOrgUsers } from '@/lib/queries/users';
import { useOrgRedemptions } from '@/lib/queries/rewards';
import { useApproveRedemption } from '@/lib/mutations/useApproveRedemption';
import { useNominations, useReviewNomination } from '@/lib/queries/nominations';
import { useNominateBadge } from '@/lib/mutations/useNominateBadge';
import { useNotificationSync } from '@/lib/hooks/useNotificationSync';
import { useMarkNotificationsRead } from '@/lib/mutations/useMarkNotificationsRead';
import { supabase } from '@/lib/supabase';

// ─── NotificationsPage ──────────────────────────────────
export function NotificationsPage({ onOpenRec: _onOpenRec }: { onOpenRec: (rec: Recognition) => void }) {
  const { notifs, unreadCount } = useNotificationSync();
  const { data: user } = useCurrentUser();
  const markRead = useMarkNotificationsRead();
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all');
  const filtered = notifs.filter(n =>
    filter === 'unread' ? !n.read : filter === 'mentions' ? n.type === 'comment' : true
  );

  const iconFor = (kind: string) => ({
    received: 'sparkle',
    reaction: 'heart',
    comment: 'pen',
    badge: 'badge',
    milestone: 'star',
    approval: 'check',
  } as Record<string, string>)[kind] || 'bell';

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Notifications</h1>
          <div className="sub">Quiet by design. We bundle the noise so the good stuff lands.</div>
        </div>
        {unreadCount > 0 && (
          <button
            className="btn-text"
            onClick={() => user?.id && markRead.mutate(user.id)}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 22 }}>
        <button className={'chip' + (filter === 'all' ? ' chip-active' : '')} onClick={() => setFilter('all')}>All</button>
        <button className={'chip' + (filter === 'unread' ? ' chip-active' : '')} onClick={() => setFilter('unread')}>
          Unread <span className="mono" style={{ marginLeft: 4 }}>{unreadCount}</span>
        </button>
        <button className={'chip' + (filter === 'mentions' ? ' chip-active' : '')} onClick={() => setFilter('mentions')}>Mentions</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.map((n, i) => (
          <div
            key={n.id}
            className="row"
            style={{
              width: '100%', padding: 16, gap: 14, background: !n.read ? 'var(--b-cream-2)' : 'transparent',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--b-border-soft)' : 'none',
              textAlign: 'left', color: 'var(--b-ink)',
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: 'var(--b-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--b-gold)',
            }}>
              <Icon name={iconFor(n.type)} size={16} />
            </div>
            <div className="grow">
              <div style={{ fontSize: 'var(--t-sm)', lineHeight: 1.4 }}>{n.msg}</div>
              {n.sub && <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 4 }}>{n.sub}</div>}
              <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 4 }}>{n.time}</div>
            </div>
            {!n.read && <span style={{ width: 8, height: 8, background: 'var(--b-gold)', borderRadius: '50%', flexShrink: 0 }} />}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="muted" style={{ padding: 40, textAlign: 'center' }}>You're all caught up. ✦</div>
        )}
      </div>
    </div>
  );
}

// ─── CoachmarksTour (DOM-anchored) ──────────────────────
interface CoachmarkStep {
  selector: string;
  title: string;
  body: string;
  cta: string;
  placement: 'bottom' | 'top' | 'right' | 'left';
}

const COACHMARK_STEPS: CoachmarkStep[] = [
  {
    selector: '.topbar',
    title: 'Welcome to Bryte ✦',
    body: "This is your recognition wall. Where teammates go to say 'I saw you. Thank you.'",
    cta: 'Show me around',
    placement: 'bottom',
  },
  {
    selector: '.btn-celebrate',
    title: 'Recognise someone',
    body: "Hit ⌘K or press R anywhere. Pick a value, write a few sentences. That's it.",
    cta: 'Got it',
    placement: 'bottom',
  },
  {
    selector: '[data-route="rewards"]',
    title: 'The points are real',
    body: 'Every recognition carries points. Stack them up, redeem for gift cards, donate, or take a day.',
    cta: 'Cool',
    placement: 'right',
  },
  {
    selector: '.topbar-search',
    title: "You're set",
    body: "Need to find your way? ⌘K opens search. Now — is there someone you've been meaning to thank?",
    cta: 'Start using Bryte',
    placement: 'bottom',
  },
];

interface AnchorRect { top: number; left: number; width: number; height: number }

export function CoachmarksTour({ onDone }: { onDone: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<AnchorRect | null>(null);
  const step = COACHMARK_STEPS[stepIdx];

  const readRect = () => {
    const el = document.querySelector<HTMLElement>(step.selector);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  };

  useEffect(() => {
    readRect();
    const onScroll = () => readRect();
    const ro = new ResizeObserver(() => readRect());
    window.addEventListener('scroll', onScroll, true);
    ro.observe(document.documentElement);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  const handleSkip = () => {
    try { localStorage.setItem('bryte.tour.v1', '1'); } catch {}
    onDone();
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleSkip(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = () => {
    if (stepIdx < COACHMARK_STEPS.length - 1) setStepIdx(i => i + 1);
    else { try { localStorage.setItem('bryte.tour.v1', '1'); } catch {} onDone(); }
  };

  const PAD = 12, TIP_W = 320;

  const tooltipStyle = (): React.CSSProperties => {
    if (!rect) return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
    const vw = window.innerWidth;
    if (step.placement === 'bottom') {
      let left = rect.left + rect.width / 2 - TIP_W / 2;
      left = Math.max(PAD, Math.min(left, vw - TIP_W - PAD));
      return { position: 'fixed', top: rect.top + rect.height + PAD, left };
    }
    if (step.placement === 'right') {
      const top = Math.max(PAD, rect.top + rect.height / 2 - 90);
      return { position: 'fixed', top, left: rect.left + rect.width + PAD };
    }
    if (step.placement === 'left') {
      const top = Math.max(PAD, rect.top + rect.height / 2 - 90);
      return { position: 'fixed', top, left: Math.max(PAD, rect.left - TIP_W - PAD) };
    }
    // top
    let left = rect.left + rect.width / 2 - TIP_W / 2;
    left = Math.max(PAD, Math.min(left, vw - TIP_W - PAD));
    return { position: 'fixed', top: Math.max(PAD, rect.top - PAD - 200), left };
  };

  const spotlightStyle = (): React.CSSProperties => {
    if (!rect) return {};
    return {
      position: 'fixed',
      top: rect.top - 4,
      left: rect.left - 4,
      width: rect.width + 8,
      height: rect.height + 8,
      borderRadius: 'var(--r-md)',
      boxShadow: '0 0 0 4000px rgba(28,20,16,0.55)',
      pointerEvents: 'none',
      zIndex: 9998,
    };
  };

  return (
    <>
      {/* Click-away backdrop */}
      <div
        onClick={handleSkip}
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, zIndex: 9997, cursor: 'default' }}
      />

      {/* Spotlight ring around anchor */}
      {rect && <div style={spotlightStyle()} />}

      {/* Tooltip card */}
      <div
        style={{
          ...tooltipStyle(),
          zIndex: 9999,
          width: TIP_W,
          background: 'var(--b-card)',
          border: '1px solid var(--b-border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: 22,
          animation: 'modal-in 250ms var(--ease-spring)',
        }}
      >
        {/* Progress pips + skip */}
        <div className="row" style={{ gap: 6, marginBottom: 14 }}>
          {COACHMARK_STEPS.map((_, idx) => (
            <span key={idx} style={{
              width: idx === stepIdx ? 22 : 6, height: 6, borderRadius: 3,
              background: idx === stepIdx ? 'var(--b-gold)' : idx < stepIdx ? 'var(--b-gold-border)' : 'var(--b-border)',
              transition: 'all 300ms',
            }} />
          ))}
          <button
            onClick={handleSkip}
            style={{ marginLeft: 'auto', fontSize: 'var(--t-xs)', color: 'var(--b-ink-4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Skip tour
          </button>
        </div>

        <h2 className="serif" style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 8px' }}>{step.title}</h2>
        <p style={{ fontSize: 'var(--t-sm)', lineHeight: 1.6, color: 'var(--b-ink-2)', margin: '0 0 18px' }}>{step.body}</p>

        <button className="btn btn-primary btn-sm" onClick={handleNext}>
          {step.cta} {stepIdx < COACHMARK_STEPS.length - 1 && <Icon name="arrow" size={12} />}
        </button>
      </div>
    </>
  );
}

// ─── BadgeNominationModal ───────────────────────────────
export function BadgeNominationModal({
  badge,
  onClose,
  onSent,
}: {
  badge: { id: string; name: string; icon: string; criteria?: string };
  onClose: () => void;
  onSent?: (payload: { nominee_name: string; badge_name: string }) => void;
}) {
  const { data: me } = useCurrentUser();
  const { data: orgUsers = [] } = useOrgUsers();
  const nominateBadge = useNominateBadge();
  const people = useMemo(
    () => orgUsers.filter(u => u.id !== me?.id).map(u => ({ id: u.id, name: u.display_name, role: u.role, title: u.title })),
    [orgUsers, me?.id]
  );
  const [pick, setPick] = useState<string>('');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [why, setWhy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const matches = pick ? people.filter(p => p.name.toLowerCase().includes(pick.toLowerCase())).slice(0, 5) : [];
  const isPicked = !!pickedId && people.some(p => p.id === pickedId && p.name === pick);

  const handleSend = async () => {
    if (!isPicked || why.trim().length < 10 || !me?.org_id || !pickedId) return;
    setSubmitting(true);
    setError(null);
    try {
      await nominateBadge.mutateAsync({
        org_id: me.org_id,
        badge_id: badge.id,
        nominee_id: pickedId,
        reason: why.trim(),
      });
      onSent?.({ nominee_name: pick, badge_name: badge.name });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit nomination');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card" style={{ width: 'min(500px, 92vw)' }} onClick={e => e.stopPropagation()}>
        <div className="row" style={{ padding: 18, borderBottom: '1px solid var(--b-border-soft)', gap: 14 }}>
          <div style={{ fontSize: 36 }}>{badge.icon}</div>
          <div className="grow">
            <div className="serif" style={{ fontWeight: 600, fontSize: '1.1rem' }}>Nominate for {badge.name}</div>
            {badge.criteria && <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 2, fontStyle: 'italic' }}>{badge.criteria}</div>}
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>

        <div style={{ padding: 18 }}>
          <label className="label" style={{ display: 'block', marginBottom: 6 }}>Who deserves this?</label>
          <div style={{ position: 'relative', marginBottom: 18 }}>
            <input
              ref={inputRef}
              value={pick}
              onChange={e => { setPick(e.target.value); setPickedId(null); }}
              placeholder="Start typing a name…"
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid var(--b-border)',
                borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', color: 'var(--b-ink)',
                fontSize: 'var(--t-sm)', outline: 'none',
              }}
            />
            {matches.length > 0 && !isPicked && (
              <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 10, overflow: 'hidden' }}>
                {matches.map(p => (
                  <button key={p.id} onClick={() => { setPick(p.name); setPickedId(p.id); }} className="row" style={{
                    width: '100%', padding: 10, gap: 10, background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left', color: 'var(--b-ink)',
                  }}>
                    <div className={`avatar sm role-${p.role}`}>{p.name.split(' ').map(s => s[0]).join('').slice(0, 2)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{p.name}</div>
                      <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>{p.title}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="label" style={{ display: 'block', marginBottom: 6 }}>Why them?</label>
          <textarea
            value={why}
            onChange={e => setWhy(e.target.value)}
            rows={4}
            placeholder="One specific moment that made you think of them for this badge."
            style={{
              width: '100%', padding: 12, fontFamily: 'var(--f-serif)', fontSize: 'var(--t-sm)',
              border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)',
              background: 'var(--b-cream-2)', color: 'var(--b-ink)', resize: 'vertical',
            }}
          />
          <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 8, lineHeight: 1.5 }}>
            Nominations are reviewed by a small committee. Recipients hear from us within a week.
          </div>
          {error && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--b-terra-pale)', color: 'var(--b-terra)', borderRadius: 'var(--r-sm)', fontSize: 'var(--t-xs)' }}>
              {error}
            </div>
          )}
        </div>

        <div className="row" style={{ padding: 14, borderTop: '1px solid var(--b-border-soft)', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <span className="grow" />
          <button className="btn btn-primary btn-sm" onClick={handleSend} disabled={!isPicked || why.trim().length < 10 || submitting}>
            {submitting ? 'Sending…' : 'Send nomination'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── useFocusTrap ───────────────────────────────────────
export function useFocusTrap(active: boolean, onEscape?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusables = (): NodeListOf<HTMLElement> =>
      el.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select, textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    focusables()[0]?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onEscape?.(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const firstEl = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    el.addEventListener('keydown', handle);
    return () => { el.removeEventListener('keydown', handle); prev?.focus?.(); };
  }, [active, onEscape]);
  return ref;
}

const _initE = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('');

// ─── ApprovalQueuePanel ─────────────────────────────────
export function ApprovalQueuePanel({ onToast }: { onToast?: (t: { kind?: 'success' | 'error' | 'info'; msg: string }) => void }) {
  const { data: user } = useCurrentUser();
  const { data: redemptions = [], isLoading } = useOrgRedemptions();
  const approveMutation = useApproveRedemption();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const pending = redemptions.filter(r => r.status === 'pending');
  const processed = redemptions.filter(r => r.status !== 'pending').slice(0, 10);

  const handleApprove = async (id: string) => {
    if (!user) return;
    setActioningId(id);
    try {
      await approveMutation.mutateAsync({
        redemption_id: id,
        status: 'approved',
        org_id: user.org_id,
        processed_by: user.id,
      });

      // Call fulfill-redemption to send email and mark fulfilled
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fulfill-redemption`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ redemption_id: id }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.message ?? 'Fulfillment failed');
      onToast?.({ kind: 'success', msg: result.email_sent ? 'Approved — fulfillment email sent ✦' : 'Approved ✦' });
    } catch (e) {
      onToast?.({ kind: 'error', msg: e instanceof Error ? e.message : 'Failed to approve' });
    } finally {
      setActioningId(null);
    }
  };

  const handleFulfill = async (id: string, opts: { resend?: boolean } = {}) => {
    setActioningId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fulfill-redemption`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ redemption_id: id, resend: !!opts.resend }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.message ?? 'Fulfillment failed');
      onToast?.({ kind: 'success', msg: opts.resend ? 'Fulfillment code re-sent ✦' : 'Fulfillment email sent ✦' });
    } catch (e) {
      onToast?.({ kind: 'error', msg: e instanceof Error ? e.message : 'Fulfillment failed' });
    } finally {
      setActioningId(null);
    }
  };

  const handleDeny = async (id: string) => {
    if (!user) return;
    setActioningId(id);
    try {
      await approveMutation.mutateAsync({
        redemption_id: id,
        status: 'cancelled',
        org_id: user.org_id,
        processed_by: user.id,
      });
      onToast?.({ kind: 'info', msg: 'Request declined' });
    } catch (e) {
      onToast?.({ kind: 'error', msg: e instanceof Error ? e.message : 'Failed to decline' });
    } finally {
      setActioningId(null);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="h3" style={{ marginBottom: 8 }}>Reward approvals</div>
        <div className="muted" style={{ fontSize: 'var(--t-small)', marginTop: 16 }}>Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div className="h3">Reward approvals</div>
          <div className="muted" style={{ fontSize: 'var(--t-small)', marginTop: 4 }}>Review and fulfil teammate reward redemptions.</div>
        </div>
        <span className="pill gold">{pending.length} pending</span>
      </div>

      {pending.length === 0 && (
        <div className="card" style={{ padding: '28px 24px', textAlign: 'center', marginTop: 18 }}>
          <div className="muted" style={{ fontSize: 'var(--t-small)' }}>No pending redemptions. All caught up ✦</div>
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="label" style={{ marginBottom: 10 }}>Pending your review</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map(r => {
              const requesterName = (r.user as any)?.display_name ?? 'Unknown';
              const rewardTitle = (r.reward as any)?.title ?? 'Reward';
              const isActioning = actioningId === r.id;
              return (
                <div key={r.id} className="card" style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 14, alignItems: 'center', opacity: isActioning ? 0.6 : 1, transition: 'opacity 200ms' }}>
                  <div className="avatar sm role-employee">{_initE(requesterName)}</div>
                  <div>
                    <div style={{ fontSize: '0.88rem', marginBottom: 3 }}>
                      <span className="serif" style={{ fontWeight: 600, color: 'var(--b-ink)' }}>{requesterName}</span>
                      <span className="muted" style={{ fontSize: '0.82rem' }}> wants to redeem </span>
                      <span style={{ fontWeight: 600, color: 'var(--b-ink)' }}>{rewardTitle}</span>
                    </div>
                    <div className="row" style={{ gap: 10, fontSize: 'var(--t-xs)', color: 'var(--b-ink-3)' }}>
                      <span className="mono">{r.points_spent.toLocaleString()} pts</span>
                      <span>·</span>
                      <span>{new Date(r.requested_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" disabled={isActioning} onClick={() => handleDeny(r.id)}>Decline</button>
                    <button className="btn btn-primary btn-sm" disabled={isActioning} onClick={() => handleApprove(r.id)}>
                      {isActioning ? '…' : 'Approve →'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {processed.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div className="label" style={{ marginBottom: 10 }}>Recently processed</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {processed.map((r, i) => {
              const requesterName = (r.user as any)?.display_name ?? 'Unknown';
              const rewardTitle = (r.reward as any)?.title ?? 'Reward';
              const statusPill = r.status === 'fulfilled'
                ? { cls: 'pill forest', style: {} }
                : r.status === 'approved'
                ? { cls: 'pill gold', style: {} }
                : { cls: 'pill', style: { background: 'var(--b-terra-pale)', color: 'var(--b-terra)' } };
              const canRefulfill = r.status === 'approved' && actioningId !== r.id;
              const canResend = r.status === 'fulfilled' && actioningId !== r.id && ((r as any).resent_count ?? 0) < 3;
              return (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto auto auto', gap: 14, padding: '12px 18px', borderBottom: i < processed.length - 1 ? '1px solid var(--b-border-soft)' : 'none', alignItems: 'center', fontSize: 'var(--t-small)' }}>
                  <div className="avatar role-employee" style={{ width: 28, height: 28, fontSize: 10 }}>{_initE(requesterName)}</div>
                  <span>
                    <span className="serif" style={{ fontWeight: 600 }}>{requesterName}</span>
                    <span className="muted"> · {rewardTitle}</span>
                  </span>
                  <span className={statusPill.cls} style={{ ...statusPill.style, width: 'fit-content' }}>{r.status}</span>
                  {canRefulfill ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleFulfill(r.id)}>Send fulfillment</button>
                  ) : canResend ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleFulfill(r.id, { resend: true })}>Resend code</button>
                  ) : <span />}
                  <span className="muted mono" style={{ fontSize: 'var(--t-xs)' }}>
                    {r.processed_at ? new Date(r.processed_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NominationApprovalsPanel ───────────────────────────
export function NominationApprovalsPanel({ onToast }: { onToast?: (t: { kind?: 'success' | 'error' | 'info'; msg: string }) => void }) {
  const { data: nominations = [], isLoading } = useNominations();
  const review = useReviewNomination();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const pending = nominations.filter(n => n.status === 'pending');
  const processed = nominations.filter(n => n.status !== 'pending').slice(0, 8);

  const handleReview = async (n: typeof pending[number], status: 'approved' | 'rejected') => {
    setActioningId(n.id);
    try {
      await review.mutateAsync({
        nomination_id: n.id,
        status,
        nominee_id: n.nominee_id,
        badge_id: n.badge_id,
      });
      onToast?.({
        kind: status === 'approved' ? 'success' : 'info',
        msg: status === 'approved' ? 'Badge awarded ✦' : 'Nomination declined',
      });
    } catch (e) {
      onToast?.({ kind: 'error', msg: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setActioningId(null);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="h3" style={{ marginBottom: 8 }}>Badge nominations</div>
        <div className="muted" style={{ fontSize: 'var(--t-small)', marginTop: 16 }}>Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div className="h3">Badge nominations</div>
          <div className="muted" style={{ fontSize: 'var(--t-small)', marginTop: 4 }}>Approve peer nominations to award badges.</div>
        </div>
        <span className="pill gold">{pending.length} pending</span>
      </div>

      {pending.length === 0 && (
        <div className="card" style={{ padding: '28px 24px', textAlign: 'center', marginTop: 18 }}>
          <div className="muted" style={{ fontSize: 'var(--t-small)' }}>No pending nominations.</div>
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pending.map(n => {
            const nominatorName = n.nominator?.display_name ?? 'Someone';
            const nomineeName = n.nominee?.display_name ?? 'a teammate';
            const badgeName = n.badge?.name ?? 'a badge';
            const badgeIcon = n.badge?.icon ?? '✦';
            const isActioning = actioningId === n.id;
            return (
              <div key={n.id} className="card" style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 14, alignItems: 'center', opacity: isActioning ? 0.6 : 1 }}>
                <div className="avatar sm role-employee">{_initE(nominatorName)}</div>
                <div>
                  <div style={{ fontSize: '0.88rem', marginBottom: 3 }}>
                    <span className="serif" style={{ fontWeight: 600, color: 'var(--b-ink)' }}>{nominatorName}</span>
                    <span className="muted" style={{ fontSize: '0.82rem' }}> nominated </span>
                    <span style={{ fontWeight: 600, color: 'var(--b-ink)' }}>{nomineeName}</span>
                    <span className="muted" style={{ fontSize: '0.82rem' }}> for </span>
                    <span style={{ fontWeight: 600, color: 'var(--b-ink)' }}>{badgeIcon} {badgeName}</span>
                  </div>
                  {n.reason && (
                    <div style={{ fontSize: 'var(--t-xs)', color: 'var(--b-ink-3)', fontStyle: 'italic', lineHeight: 1.5 }}>
                      &ldquo;{n.reason}&rdquo;
                    </div>
                  )}
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" disabled={isActioning} onClick={() => handleReview(n, 'rejected')}>Decline</button>
                  <button className="btn btn-primary btn-sm" disabled={isActioning} onClick={() => handleReview(n, 'approved')}>
                    {isActioning ? '…' : 'Award →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {processed.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div className="label" style={{ marginBottom: 10 }}>Recently processed</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {processed.map((n, i) => {
              const pill = n.status === 'approved'
                ? { cls: 'pill forest' }
                : { cls: 'pill', style: { background: 'var(--b-terra-pale)', color: 'var(--b-terra)' } as React.CSSProperties };
              return (
                <div key={n.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 14, padding: '12px 18px', borderBottom: i < processed.length - 1 ? '1px solid var(--b-border-soft)' : 'none', alignItems: 'center', fontSize: 'var(--t-small)' }}>
                  <span>
                    <span className="serif" style={{ fontWeight: 600 }}>{n.nominee?.display_name ?? 'Unknown'}</span>
                    <span className="muted"> · {n.badge?.icon} {n.badge?.name}</span>
                  </span>
                  <span className={pill.cls} style={{ ...(pill.style ?? {}), width: 'fit-content' }}>{n.status}</span>
                  <span className="muted mono" style={{ fontSize: 'var(--t-xs)' }}>
                    {new Date(n.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OrgChartPanel ──────────────────────────────────────
// Builds a reporting tree from users.manager_id. Users whose manager isn't in
// the current org (or is null) are treated as roots.
interface OrgUserRow {
  id: string;
  display_name: string;
  role: string;
  title: string;
  manager_id: string | null;
  points: number;
  start_date: string | null;
}

interface OrgNode {
  id: string;
  name: string;
  role: string;
  title: string;
  tenure: string;
  points: number;
  isMe: boolean;
  reports: OrgNode[];
}

function tenureFor(start: string | null): string {
  if (!start) return '—';
  const years = (Date.now() - new Date(start).getTime()) / (365.25 * 86_400_000);
  if (years < 1) return `${Math.max(1, Math.round(years * 12))}mo`;
  return `${Math.round(years)}Y`;
}

function buildTree(users: OrgUserRow[], meId: string | undefined): OrgNode[] {
  const byId = new Map<string, OrgNode>();
  const roots: OrgNode[] = [];

  users.forEach(u => {
    byId.set(u.id, {
      id: u.id,
      name: u.display_name,
      role: u.role,
      title: u.title || (u.role === 'admin' ? 'Admin' : u.role === 'manager' ? 'Manager' : 'Team member'),
      tenure: tenureFor(u.start_date),
      points: u.points,
      isMe: u.id === meId,
      reports: [],
    });
  });

  byId.forEach(node => {
    const parent = users.find(u => u.id === node.id)?.manager_id;
    if (parent && byId.has(parent)) byId.get(parent)!.reports.push(node);
    else roots.push(node);
  });

  return roots;
}

export function OrgChartPanel() {
  const { data: users = [], isLoading } = useOrgUsers();
  const { data: me } = useCurrentUser();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const roots = useMemo(() => buildTree(users as unknown as OrgUserRow[], me?.id), [users, me?.id]);

  // Auto-expand first two levels on first load
  useEffect(() => {
    if (expanded.size === 0 && roots.length > 0) {
      const s = new Set<string>();
      roots.forEach(r => {
        s.add(r.id);
        r.reports.forEach(c => s.add(c.id));
      });
      setExpanded(s);
    }
  }, [roots, expanded.size]);

  const renderNode = (n: OrgNode, depth = 0): React.ReactElement => {
    const isOpen = expanded.has(n.id);
    const hasReports = n.reports && n.reports.length > 0;
    return (
      <div key={n.id} style={{ marginLeft: depth * 28, position: 'relative' }}>
        {depth > 0 && <div style={{ position: 'absolute', left: -18, top: 0, bottom: 20, width: 1, background: 'var(--b-border)' }} />}
        {depth > 0 && <div style={{ position: 'absolute', left: -18, top: 24, width: 14, height: 1, background: 'var(--b-border)' }} />}
        <div style={{
          display: 'grid', gridTemplateColumns: '18px 36px 1fr auto', gap: 10, alignItems: 'center',
          padding: '10px 12px', marginBottom: 6,
          background: n.isMe ? 'var(--b-gold-pale)' : 'var(--b-card)',
          border: '1px solid ' + (n.isMe ? 'var(--b-gold-border)' : 'var(--b-border-soft)'),
          borderRadius: 'var(--r-md)', position: 'relative',
        }}>
          {hasReports ? (
            <button onClick={() => toggle(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--b-ink-3)', fontSize: 10, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 200ms var(--ease)' }}>▶</button>
          ) : <span />}
          <div className={`avatar sm role-${n.role}`}>{_initE(n.name)}</div>
          <div style={{ overflow: 'hidden' }}>
            <div className="row" style={{ gap: 6 }}>
              <span className="serif" style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--b-ink)' }}>{n.name}</span>
              {n.isMe && <span className="pill gold" style={{ fontSize: 9 }}>You</span>}
            </div>
            <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 1 }}>{n.title} · {n.tenure}</div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <div className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--b-gold)', fontWeight: 600 }}>{n.points.toLocaleString()} pts</div>
          </div>
        </div>
        {hasReports && isOpen && <div style={{ marginLeft: 18 }}>{n.reports.map(r => renderNode(r, depth + 1))}</div>}
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: '22px 24px' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div className="h3">Reporting tree</div>
          <div className="muted" style={{ fontSize: 'var(--t-small)', marginTop: 4 }}>Your team and the wider chain.</div>
        </div>
        {roots.length > 0 && (
          <button className="btn-text" style={{ fontSize: 'var(--t-xs)' }} onClick={() => setExpanded(new Set())}>Collapse all</button>
        )}
      </div>
      {isLoading ? (
        <div className="muted" style={{ padding: 40, textAlign: 'center' }}>Loading team…</div>
      ) : roots.length === 0 ? (
        <div className="muted" style={{ padding: 40, textAlign: 'center' }}>
          No teammates yet. Invite someone from Admin → Team.
        </div>
      ) : (
        roots.map(r => renderNode(r))
      )}
    </div>
  );
}
