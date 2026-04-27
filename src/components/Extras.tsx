'use client';

import { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { BRYTE_DATA } from '@/lib/data';
import type { Recognition } from '@/lib/types';

// ─── NotificationsPage ──────────────────────────────────
export function NotificationsPage({ onOpenRec }: { onOpenRec: (rec: Recognition) => void }) {
  const all = (BRYTE_DATA as any).NOTIFICATIONS as Array<{
    id: string; kind: string; actor: string; actorRole?: string; text: string; time: string;
    unread: boolean; value?: string; emoji?: string; snippet?: string; badge?: string; icon?: string;
  }>;
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all');
  const filtered = all.filter(n => filter === 'unread' ? n.unread : filter === 'mentions' ? n.kind === 'comment' : true);
  const sample = BRYTE_DATA.INDUSTRIES.healthcare.sampleRecs[0] as any;

  const handleClick = (n: typeof all[number]) => {
    if (n.kind === 'recognition' || n.kind === 'reaction' || n.kind === 'comment') {
      onOpenRec({ ...sample, _id: 'notif-' + n.id } as Recognition);
    }
  };

  const iconFor = (kind: string) => ({
    recognition: 'sparkle',
    reaction: 'heart',
    comment: 'pen',
    badge: 'badge',
    nomination: 'star',
    approval: 'check',
    anniversary: 'gift',
  } as Record<string, string>)[kind] || 'bell';

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Notifications</h1>
          <div className="sub">Quiet by design. We bundle the noise so the good stuff lands.</div>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 22 }}>
        <button className={'chip' + (filter === 'all' ? ' chip-active' : '')} onClick={() => setFilter('all')}>All</button>
        <button className={'chip' + (filter === 'unread' ? ' chip-active' : '')} onClick={() => setFilter('unread')}>
          Unread <span className="mono" style={{ marginLeft: 4 }}>{all.filter(n => n.unread).length}</span>
        </button>
        <button className={'chip' + (filter === 'mentions' ? ' chip-active' : '')} onClick={() => setFilter('mentions')}>Mentions</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.map((n, i) => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className="row"
            style={{
              width: '100%', padding: 16, gap: 14, background: n.unread ? 'var(--b-cream-2)' : 'transparent',
              border: 'none', borderBottom: i < filtered.length - 1 ? '1px solid var(--b-border-soft)' : 'none',
              cursor: 'pointer', textAlign: 'left', color: 'var(--b-ink)',
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: 'var(--b-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--b-gold)',
            }}>
              <Icon name={iconFor(n.kind)} size={16} />
            </div>
            <div className="grow">
              <div style={{ fontSize: 'var(--t-sm)', lineHeight: 1.4 }}>
                <strong>{n.actor}</strong> {n.text}
                {n.value && <span className="chip-mini" style={{ marginLeft: 6 }}>{n.value}</span>}
              </div>
              {n.snippet && <div className="muted" style={{ fontSize: 'var(--t-xs)', fontStyle: 'italic', marginTop: 4 }}>"{n.snippet}"</div>}
              {n.badge && <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 4 }}>{n.icon || ''} {n.badge}</div>}
              <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 4 }}>{n.time}</div>
            </div>
            {n.unread && <span style={{ width: 8, height: 8, background: 'var(--b-gold)', borderRadius: '50%', flexShrink: 0 }} />}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="muted" style={{ padding: 40, textAlign: 'center' }}>You're all caught up. ✦</div>
        )}
      </div>
    </div>
  );
}

// ─── CoachmarksTour ─────────────────────────────────────
export function CoachmarksTour({ onDone }: { onDone: () => void }) {
  const steps = [
    {
      title: 'Welcome to Bryte ✦',
      body: "This is your recognition wall. Where teammates go to say 'I saw you. Thank you.'",
      cta: 'Show me around',
    },
    {
      title: 'Recognise someone',
      body: "Hit ⌘K or press R anywhere. Pick a value, write a few sentences. That's it.",
      cta: 'Got it',
    },
    {
      title: 'The points are real',
      body: "Every recognition carries points. Stack them up, redeem for gift cards, donate, or take a day.",
      cta: 'Cool',
    },
    {
      title: "You're set",
      body: "Need to find your way? ⌘K opens search. Now — is there someone you've been meaning to thank?",
      cta: 'Start using Bryte',
    },
  ];
  const [i, setI] = useState(0);
  const step = steps[i];

  const handleNext = () => {
    if (i < steps.length - 1) setI(i + 1);
    else { try { localStorage.setItem('bryte.tour.v1', '1'); } catch {} onDone(); }
  };

  const handleSkip = () => {
    try { localStorage.setItem('bryte.tour.v1', '1'); } catch {}
    onDone();
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleSkip(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="modal-backdrop">
      <div className="card" style={{ width: 'min(440px, 92vw)', padding: 28, textAlign: 'center' }}>
        <div className="row" style={{ justifyContent: 'center', gap: 6, marginBottom: 18 }}>
          {steps.map((_, idx) => (
            <span key={idx} style={{
              width: idx === i ? 22 : 6, height: 6, borderRadius: 3,
              background: idx === i ? 'var(--b-gold)' : 'var(--b-border)',
              transition: 'all .3s',
            }} />
          ))}
        </div>
        <h2 className="serif" style={{ fontSize: '1.4rem', fontWeight: 600, margin: 0 }}>{step.title}</h2>
        <p style={{ marginTop: 12, lineHeight: 1.6, color: 'var(--b-ink-2)', fontSize: 'var(--t-md)' }}>{step.body}</p>
        <div className="row" style={{ marginTop: 22, gap: 8, justifyContent: 'center' }}>
          {i < steps.length - 1 && <button className="btn btn-ghost btn-sm" onClick={handleSkip}>Skip</button>}
          <button className="btn btn-primary" onClick={handleNext}>
            {step.cta} {i < steps.length - 1 && <Icon name="arrow" size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BadgeNominationModal ───────────────────────────────
export function BadgeNominationModal({
  badge,
  onClose,
  onSend,
}: {
  badge: { name: string; icon: string; criteria?: string };
  onClose: () => void;
  onSend: (person: string) => void;
}) {
  const people = ((BRYTE_DATA as any).LEADERBOARD as Array<{ name: string; role: string; title: string }>);
  const [pick, setPick] = useState<string>('');
  const [why, setWhy] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const matches = pick ? people.filter(p => p.name.toLowerCase().includes(pick.toLowerCase())).slice(0, 5) : [];
  const isPicked = people.some(p => p.name === pick);

  const handleSend = () => {
    if (!isPicked || why.trim().length < 10) return;
    onSend(pick);
    onClose();
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
              onChange={e => setPick(e.target.value)}
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
                  <button key={p.name} onClick={() => setPick(p.name)} className="row" style={{
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
        </div>

        <div className="row" style={{ padding: 14, borderTop: '1px solid var(--b-border-soft)', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <span className="grow" />
          <button className="btn btn-primary btn-sm" onClick={handleSend} disabled={!isPicked || why.trim().length < 10}>
            Send nomination
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
  const [queue, setQueue] = useState(BRYTE_DATA.APPROVAL_QUEUE);
  const pending = queue.filter(q => q.status === 'pending');
  const processed = queue.filter(q => q.status !== 'pending');

  const approve = (id: string) => { setQueue(q => q.map(x => x.id === id ? { ...x, status: 'approved' } : x)); onToast?.({ kind: 'success', msg: 'Approved ✦' }); };
  const deny = (id: string) => { setQueue(q => q.map(x => x.id === id ? { ...x, status: 'denied' } : x)); onToast?.({ kind: 'info', msg: 'Request declined' }); };

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div className="h3">Reward approvals</div>
          <div className="muted" style={{ fontSize: 'var(--t-small)', marginTop: 4 }}>Rewards over 1,500 pts need a manager sign-off.</div>
        </div>
        <span className="pill gold">{pending.length} pending</span>
      </div>

      {pending.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="label" style={{ marginBottom: 10 }}>Pending your review</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map(r => (
              <div key={r.id} className="card" style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 14, alignItems: 'center' }}>
                <div className="avatar sm role-employee">{_initE(r.requester)}</div>
                <div>
                  <div style={{ fontSize: '0.88rem', marginBottom: 3 }}>
                    <span className="serif" style={{ fontWeight: 600, color: 'var(--b-ink)' }}>{r.requester}</span>
                    <span className="muted" style={{ fontSize: '0.82rem' }}> wants to redeem </span>
                    <span style={{ fontWeight: 600, color: 'var(--b-ink)' }}>{r.reward}</span>
                  </div>
                  <div className="row" style={{ gap: 10, fontSize: 'var(--t-xs)', color: 'var(--b-ink-3)' }}>
                    <span className="mono">{r.points.toLocaleString()} pts</span>
                    <span>·</span>
                    <span>{r.requested}</span>
                    {r.reason && <><span>·</span><span className="italic">"{r.reason}"</span></>}
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => deny(r.id)}>Decline</button>
                  <button className="btn btn-primary btn-sm" onClick={() => approve(r.id)}>Approve →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {processed.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div className="label" style={{ marginBottom: 10 }}>Recently processed</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {processed.map((r, i) => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto auto', gap: 14, padding: '12px 18px', borderBottom: i < processed.length - 1 ? '1px solid var(--b-border-soft)' : 'none', alignItems: 'center', fontSize: 'var(--t-small)' }}>
                <div className="avatar role-employee" style={{ width: 28, height: 28, fontSize: 10 }}>{_initE(r.requester)}</div>
                <span>
                  <span className="serif" style={{ fontWeight: 600 }}>{r.requester}</span>
                  <span className="muted"> · {r.reward}</span>
                </span>
                <span className={`pill ${r.status === 'approved' ? 'forest' : ''}`} style={{ background: r.status === 'denied' ? 'var(--b-terra-pale)' : undefined, color: r.status === 'denied' ? 'var(--b-terra)' : undefined }}>{r.status}</span>
                <span className="muted mono" style={{ fontSize: 'var(--t-xs)' }}>{r.requested}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OrgChartPanel ──────────────────────────────────────
type OrgNode = { name: string; role: string; title: string; tenure: string; points: number; isMe?: boolean; reports: OrgNode[] };

export function OrgChartPanel() {
  const tree = BRYTE_DATA.ORG_TREE as OrgNode;
  const [expanded, setExpanded] = useState(new Set(['Dr. James Morrison', 'Alex Thibodeau', 'Sofia Alvarez']));
  const toggle = (name: string) => setExpanded(s => {
    const n = new Set(s);
    if (n.has(name)) n.delete(name); else n.add(name);
    return n;
  });

  const renderNode = (n: OrgNode, depth = 0): React.ReactElement => {
    const isOpen = expanded.has(n.name);
    const hasReports = n.reports && n.reports.length > 0;
    return (
      <div key={n.name} style={{ marginLeft: depth * 28, position: 'relative' }}>
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
            <button onClick={() => toggle(n.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--b-ink-3)', fontSize: 10, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 200ms var(--ease)' }}>▶</button>
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
            {!n.isMe && <button className="btn-text" style={{ fontSize: 'var(--t-xs)' }}>Recognise →</button>}
          </div>
        </div>
        {hasReports && isOpen && <div style={{ marginLeft: 18 }}>{n.reports.map((r: OrgNode) => renderNode(r, depth + 1))}</div>}
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: '22px 24px' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div className="h3">Reporting tree</div>
          <div className="muted" style={{ fontSize: 'var(--t-small)', marginTop: 4 }}>Your team and the wider chain — click any teammate to recognise them.</div>
        </div>
        <button className="btn-text" style={{ fontSize: 'var(--t-xs)' }} onClick={() => setExpanded(new Set())}>Collapse all</button>
      </div>
      {renderNode(tree)}
    </div>
  );
}
