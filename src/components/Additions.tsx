'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from './Icon';
import { BRYTE_DATA } from '@/lib/data';
import type { Recognition } from '@/lib/types';

const initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('');

// ─── ProfilePage ────────────────────────────────────────
export function ProfilePage({
  onRecognize,
  onOpenRec,
}: {
  onRecognize: () => void;
  onOpenRec: (rec: Recognition) => void;
}) {
  const me = BRYTE_DATA.CURRENT_USER;
  const badges = ((BRYTE_DATA as any).BADGES as Array<{ id: string; name: string; icon: string; earned: boolean; date?: string }>).filter(b => b.earned);
  const recentRecs = (BRYTE_DATA.INDUSTRIES.healthcare.sampleRecs as Array<any>).slice(0, 3).map((r, i): Recognition => ({
    ...(r as any),
    _id: `profile-${i}`,
    type: r.type as Recognition['type'],
  }));

  return (
    <div>
      <div className="card" style={{ padding: 32, marginBottom: 24, textAlign: 'center' }}>
        <div className={`avatar xl role-${me.role}`} style={{ margin: '0 auto 14px', width: 88, height: 88, fontSize: 28 }}>{me.initials}</div>
        <h1 className="serif" style={{ fontSize: '1.8rem', fontWeight: 600, margin: 0 }}>{me.displayName}</h1>
        <div className="muted" style={{ marginTop: 4 }}>{me.title}</div>

        <div className="row" style={{ justifyContent: 'center', gap: 36, marginTop: 22 }}>
          <div>
            <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--b-gold)' }}>{me.points.toLocaleString()}</div>
            <div className="label">points</div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--b-forest)' }}>{badges.length}</div>
            <div className="label">badges</div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--b-ink)' }}>12</div>
            <div className="label">day streak</div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700 }}>#6</div>
            <div className="label">on board</div>
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={onRecognize}>
          <Icon name="sparkle" size={14} /> Recognise someone
        </button>
      </div>

      <h2 className="serif" style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 12px' }}>Badges</h2>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {badges.map(b => (
          <div key={b.id} className="card" style={{ padding: '10px 14px' }}>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ fontSize: 20 }}>{b.icon}</span>
              <div>
                <div className="serif" style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{b.name}</div>
                <div className="muted" style={{ fontSize: 9 }}>{b.date}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="serif" style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 12px' }}>Recent recognitions</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {recentRecs.map(r => (
          <div key={r._id} className="card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => onOpenRec(r)}>
            <div className="row" style={{ gap: 10, marginBottom: 6 }}>
              <span className="chip-mini">{r.value}</span>
              <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>· {r.time}</span>
              <span className="grow" />
              <span className="mono" style={{ color: 'var(--b-gold)', fontWeight: 700, fontSize: 'var(--t-xs)' }}>+{r.points}</span>
            </div>
            <div style={{ fontSize: 'var(--t-sm)', lineHeight: 1.5 }}>"{r.message}"</div>
            <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 6 }}>From {r.sender}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SearchPalette ──────────────────────────────────────
export function SearchPalette({ onClose, onJump }: { onClose: () => void; onJump: (route: string) => void }) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const items = [
    { kind: 'action', label: 'Recognise someone', icon: 'sparkle', route: '__recognize' },
    { kind: 'page', label: 'Recognition feed', icon: 'feed', route: 'feed' },
    { kind: 'page', label: 'My profile', icon: 'users', route: 'profile' },
    { kind: 'page', label: 'Notifications', icon: 'bell', route: 'notifications' },
    { kind: 'page', label: 'Leaderboard', icon: 'trophy', route: 'leaderboard' },
    { kind: 'page', label: 'Badges', icon: 'badge', route: 'badges' },
    { kind: 'page', label: 'Rewards', icon: 'gift', route: 'rewards' },
    { kind: 'page', label: 'Team pulse', icon: 'users', route: 'manager' },
    { kind: 'page', label: 'Analytics', icon: 'chart', route: 'analytics' },
    { kind: 'page', label: 'Admin', icon: 'shield', route: 'admin' },
  ];
  const filtered = q ? items.filter(i => i.label.toLowerCase().includes(q.toLowerCase())) : items;
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [q]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && filtered[active]) { onJump(filtered[active].route); onClose(); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card" style={{ width: 'min(560px, 92vw)', maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div className="row" style={{ padding: 14, borderBottom: '1px solid var(--b-border-soft)', gap: 10 }}>
          <Icon name="search" size={16} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Jump to a page or action…"
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 'var(--t-md)', color: 'var(--b-ink)' }}
          />
          <kbd style={{ fontFamily: 'var(--f-mono)', fontSize: 10, padding: '2px 6px', border: '1px solid var(--b-border)', borderRadius: 4 }}>esc</kbd>
        </div>
        <div style={{ overflow: 'auto', maxHeight: '50vh' }}>
          {filtered.length === 0 && <div className="muted" style={{ padding: 22, textAlign: 'center' }}>Nothing matches "{q}".</div>}
          {filtered.map((item, i) => (
            <button
              key={item.label}
              onMouseEnter={() => setActive(i)}
              onClick={() => { onJump(item.route); onClose(); }}
              className="row"
              style={{
                width: '100%', padding: '10px 14px', gap: 12, background: i === active ? 'var(--b-cream-2)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--b-ink)',
              }}
            >
              <Icon name={item.icon} size={14} />
              <span style={{ flex: 1 }}>{item.label}</span>
              <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>{item.kind}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RecognitionDetail ──────────────────────────────────
export function RecognitionDetail({ rec, onClose, onRecognize }: { rec: Recognition; onClose: () => void; onRecognize: () => void }) {
  const comments = ((BRYTE_DATA as any).SAMPLE_COMMENTS as Array<{ author: string; role: string; text: string; time: string }>);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card" style={{ width: 'min(640px, 92vw)', maxHeight: '88vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="row" style={{ padding: 18, borderBottom: '1px solid var(--b-border-soft)' }}>
          <div className="grow">
            <div className="row" style={{ gap: 8 }}>
              <span className="chip-mini">{rec.value}</span>
              <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>· {rec.time}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>

        <div style={{ padding: 22 }}>
          <div className="row" style={{ gap: 12, marginBottom: 16 }}>
            <div className={`avatar md role-${rec.senderRole === 'manager' ? 'manager' : 'employee'}`}>{rec.sender.split(' ').map(s => s[0]).slice(0, 2).join('')}</div>
            <div>
              <div className="serif" style={{ fontWeight: 600 }}>{rec.sender}</div>
              <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>recognised <strong>{rec.recipient}</strong></div>
            </div>
            <span className="grow" />
            <span className="mono" style={{ color: 'var(--b-gold)', fontWeight: 700 }}>+{rec.points} pts</span>
          </div>

          <blockquote className="serif" style={{
            fontSize: '1.15rem', lineHeight: 1.6, margin: 0, padding: '18px 22px',
            background: 'var(--b-cream-2)', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--b-gold)',
          }}>
            "{rec.message}"
          </blockquote>

          {Object.keys(rec.reactions || {}).length > 0 && (
            <div className="row" style={{ gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
              {Object.entries(rec.reactions).map(([emoji, count]) => (
                <span key={emoji} className="chip" style={{ padding: '4px 10px' }}>{emoji} {count as number}</span>
              ))}
            </div>
          )}

          <div style={{ marginTop: 22 }}>
            <div className="label" style={{ marginBottom: 10 }}>Comments</div>
            {comments.map((c, i) => (
              <div key={i} className="row" style={{ gap: 10, padding: '10px 0', borderTop: i > 0 ? '1px solid var(--b-border-soft)' : 'none' }}>
                <div className={`avatar sm role-${c.role}`}>{c.author.split(' ').map(s => s[0]).slice(0, 2).join('')}</div>
                <div className="grow">
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{c.author}</span>
                    <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>· {c.time}</span>
                  </div>
                  <div style={{ fontSize: 'var(--t-sm)', marginTop: 2 }}>{c.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="row" style={{ padding: 14, borderTop: '1px solid var(--b-border-soft)', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          <span className="grow" />
          <button className="btn btn-primary btn-sm" onClick={onRecognize}>
            <Icon name="sparkle" size={12} /> Recognise back
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DigestPreview ──────────────────────────────────────
export function DigestPreview({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const recs = BRYTE_DATA.INDUSTRIES.healthcare.sampleRecs.slice(0, 3);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card" style={{ width: 'min(560px, 92vw)', maxHeight: '88vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="row" style={{ padding: 18, borderBottom: '1px solid var(--b-border-soft)' }}>
          <div className="grow">
            <div className="serif" style={{ fontWeight: 600, fontSize: '1.05rem' }}>Weekly digest preview</div>
            <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>Sent every Monday, 9am local</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
        <div style={{ padding: 22, background: 'var(--b-cream-2)' }}>
          <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: 6 }}>This week at Mapleview ✦</div>
          <div className="muted" style={{ fontSize: 'var(--t-sm)', marginBottom: 22 }}>April 19 – April 25</div>

          <div className="row" style={{ gap: 12, marginBottom: 22 }}>
            <div className="card grow" style={{ padding: 12, textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--b-gold)' }}>34</div>
              <div className="label">recognitions</div>
            </div>
            <div className="card grow" style={{ padding: 12, textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--b-forest)' }}>21</div>
              <div className="label">teammates</div>
            </div>
            <div className="card grow" style={{ padding: 12, textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 700 }}>2,140</div>
              <div className="label">points given</div>
            </div>
          </div>

          <div className="serif" style={{ fontWeight: 600, marginBottom: 10 }}>Highlights</div>
          {recs.map((r, i) => (
            <div key={i} className="card" style={{ padding: 14, marginBottom: 10 }}>
              <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                <span className="chip-mini">{r.value}</span>
              </div>
              <div style={{ fontSize: 'var(--t-sm)', lineHeight: 1.5 }}>"{r.message}"</div>
              <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 6 }}>{r.sender} → {r.recipient}</div>
            </div>
          ))}
        </div>
        <div className="row" style={{ padding: 14, borderTop: '1px solid var(--b-border-soft)', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          <span className="grow" />
          <button className="btn btn-primary btn-sm">Send to me now</button>
        </div>
      </div>
    </div>
  );
}

// ─── ManagerNudgeModal ──────────────────────────────────
export function ManagerNudgeModal({
  person,
  onClose,
  onSend,
}: {
  person: string;
  onClose: () => void;
  onSend: (person: string) => void;
}) {
  const prompts = useMemo(() => [
    `Notice ${person.split(' ')[0]} hasn't been recognised in 30+ days. A quick note can change a week.`,
    `What did ${person.split(' ')[0]} do recently that you appreciated?`,
    `Even a one-line thank-you lands. Keep it specific.`,
  ], [person]);
  const [msg, setMsg] = useState(`${person.split(' ')[0]}, I've been meaning to say — `);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card" style={{ width: 'min(480px, 92vw)' }} onClick={e => e.stopPropagation()}>
        <div className="row" style={{ padding: 18, borderBottom: '1px solid var(--b-border-soft)' }}>
          <div className="grow">
            <div className="serif" style={{ fontWeight: 600 }}>Send {person.split(' ')[0]} a note</div>
            <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>Private. Won't appear on the wall.</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
        <div style={{ padding: 18 }}>
          <div className="muted" style={{ fontSize: 'var(--t-xs)', lineHeight: 1.6, marginBottom: 12 }}>
            {prompts[0]}
          </div>
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            rows={5}
            style={{
              width: '100%', padding: 12, fontFamily: 'var(--f-serif)', fontSize: 'var(--t-sm)',
              border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)',
              background: 'var(--b-cream-2)', color: 'var(--b-ink)', resize: 'vertical',
            }}
          />
        </div>
        <div className="row" style={{ padding: 14, borderTop: '1px solid var(--b-border-soft)', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <span className="grow" />
          <button className="btn btn-primary btn-sm" onClick={() => onSend(person)} disabled={msg.trim().length < 10}>
            Send privately
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BillingPanel ───────────────────────────────────────
export function BillingPanel() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="card" style={{ padding: 28 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div className="serif italic" style={{ fontSize: 'var(--t-xs)', color: 'var(--b-gold)', marginBottom: 4 }}>Current subscription</div>
              <div className="h2">Growth plan · CA$4/teammate/month</div>
              <div className="muted" style={{ fontSize: 'var(--t-small)', marginTop: 6 }}>148 active seats · next invoice May 1</div>
            </div>
            <span className="pill gold">Active</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { l: 'Next invoice', v: 'CA$1,880', sub: '148 × CA$4 + taxes' },
              { l: 'Points pool remaining', v: '35,880', sub: 'of 120,000' },
              { l: 'Annual value', v: 'CA$22,560', sub: 'billed monthly' },
            ].map(s => (
              <div key={s.l} style={{ padding: '14px 16px', background: 'var(--b-surface)', borderRadius: 'var(--r-md)' }}>
                <div className="label">{s.l}</div>
                <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--b-ink)', marginTop: 4 }}>{s.v}</div>
                <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-primary">Top up points pool</button>
            <button className="btn btn-ghost">Change plan</button>
            <button className="btn-text" style={{ marginLeft: 'auto' }}>Export invoices →</button>
          </div>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--b-border-soft)' }} className="h3">Invoice history</div>
          {[
            { date: 'Apr 1, 2026', amt: 'CA$1,880.00', status: 'Paid', inv: 'BR-2026-0421' },
            { date: 'Mar 1, 2026', amt: 'CA$1,752.00', status: 'Paid', inv: 'BR-2026-0313' },
            { date: 'Feb 1, 2026', amt: 'CA$1,688.00', status: 'Paid', inv: 'BR-2026-0201' },
            { date: 'Jan 1, 2026', amt: 'CA$1,688.00', status: 'Paid', inv: 'BR-2026-0101' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 100px 60px', gap: 14, padding: '14px 24px', borderBottom: i < 3 ? '1px solid var(--b-border-soft)' : 'none', alignItems: 'center', fontSize: 'var(--t-small)' }}>
              <span className="mono" style={{ color: 'var(--b-ink)', fontWeight: 600 }}>{r.date}</span>
              <span style={{ color: 'var(--b-ink-3)' }}>{r.inv}</span>
              <span className="mono" style={{ color: 'var(--b-ink)', fontWeight: 600 }}>{r.amt}</span>
              <span className="pill forest" style={{ width: 'fit-content' }}>{r.status}</span>
              <button className="btn-text" style={{ fontSize: 'var(--t-xs)' }}>PDF →</button>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, var(--b-gold-pale), var(--b-surface))', border: '1px solid var(--b-gold-border)' }}>
        <div className="serif italic" style={{ fontSize: 'var(--t-xs)', color: 'var(--b-gold)' }}>Next tier</div>
        <div className="h3 mt-1" style={{ marginTop: 4 }}>Enterprise</div>
        <div className="muted" style={{ fontSize: 'var(--t-small)', margin: '8px 0 16px', lineHeight: 1.6 }}>
          For teams of 250+. Custom SLAs, dedicated CSM, Workday & ADP sync, SAML SSO, audit logs, custom rewards catalogue, French-Canadian support.
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['Dedicated success manager', 'Workday + ADP integration', 'Custom reward brands', 'Audit logs + SOC 2 report', 'FR-CA service coverage'].map(f => (
            <li key={f} className="row" style={{ gap: 8, fontSize: 'var(--t-small)', color: 'var(--b-ink-2)' }}>
              <Icon name="check" size={12} stroke={2.5} style={{ color: 'var(--b-forest)' }} /> {f}
            </li>
          ))}
        </ul>
        <button className="btn btn-primary btn-block">Talk to us →</button>
      </div>
    </div>
  );
}

// ─── IntegrationsPanel ──────────────────────────────────
export function IntegrationsPanel() {
  const I = BRYTE_DATA.INTEGRATIONS;
  return (
    <div>
      <div className="h3 mb-4">Connected apps</div>
      <div className="muted" style={{ fontSize: 'var(--t-small)', marginBottom: 20, maxWidth: 500 }}>
        Recognition fits where your team already works. Connect Slack or Teams to let people recognise each other with a slash command.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {I.map(app => (
          <div key={app.name} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="row" style={{ gap: 12, alignItems: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: app.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
                {app.name[0]}
              </div>
              <div className="grow">
                <div className="serif" style={{ fontWeight: 600, color: 'var(--b-ink)' }}>{app.name}</div>
                {app.connected && <span className="pill forest" style={{ fontSize: 9, marginTop: 2 }}>● Connected</span>}
              </div>
            </div>
            <div className="muted" style={{ fontSize: 'var(--t-xs)', lineHeight: 1.5, minHeight: 30 }}>{app.desc}</div>
            <button className={'btn btn-sm ' + (app.connected ? 'btn-ghost' : 'btn-primary')} style={{ marginTop: 'auto' }}>
              {app.connected ? 'Manage →' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NominationsBanner ──────────────────────────────────
export function NominationsBanner({ onVote }: { onVote?: (name: string) => void }) {
  const N = BRYTE_DATA.NOMINEES;
  const [votedFor, setVotedFor] = useState<string | null>(null);
  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--b-ink) 0%, var(--b-ink-2) 100%)',
      borderRadius: 'var(--r-lg)', padding: '22px 28px', marginBottom: 22,
      color: 'var(--b-canvas)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', right: -20, top: -40, fontSize: 200, color: 'rgba(194,136,45,0.08)', fontFamily: 'Fraunces', lineHeight: 1 }}>★</div>
      <div style={{ position: 'relative', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', minWidth: 200 }}>
          <div className="serif italic" style={{ fontSize: '0.85rem', color: 'var(--b-gold-light)', marginBottom: 6 }}>Ends Friday</div>
          <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--b-canvas)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Teammate of April
          </div>
          <div style={{ fontSize: 'var(--t-small)', color: 'rgba(250,246,239,0.7)', marginTop: 6, lineHeight: 1.5 }}>
            Vote for who lit up the wall this month. Winner gets CA$200 + their name on the lobby wall.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flex: '2 1 400px', flexWrap: 'wrap' }}>
          {N.map(n => (
            <button key={n.name} onClick={() => { setVotedFor(n.name); onVote?.(n.name); }} style={{
              background: votedFor === n.name ? 'var(--b-gold)' : 'rgba(255,255,255,0.06)',
              border: '1px solid ' + (votedFor === n.name ? 'var(--b-gold)' : 'rgba(255,255,255,0.12)'),
              borderRadius: 'var(--r-md)', padding: '12px 14px',
              cursor: 'pointer', flex: '1 1 140px',
              textAlign: 'left', transition: 'all 200ms var(--ease)',
              color: votedFor === n.name ? '#FAF6EF' : 'var(--b-canvas)',
            }}
            onMouseEnter={e => { if (votedFor !== n.name) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { if (votedFor !== n.name) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
              <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                <div className={`avatar sm role-${n.role}`} style={{ border: '2px solid rgba(255,255,255,0.2)' }}>{initials(n.name)}</div>
                <div>
                  <div className="serif" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{n.name}</div>
                  <div style={{ fontSize: 9, opacity: 0.7 }}>{n.votes} votes</div>
                </div>
              </div>
              <div style={{ fontSize: 'var(--t-xs)', opacity: 0.8, fontStyle: 'italic', lineHeight: 1.4 }}>"{n.quote}"</div>
              {votedFor === n.name && <div style={{ fontSize: 10, fontWeight: 700, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={10} stroke={3} /> VOTED</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AnniversaryStrip ───────────────────────────────────
export function AnniversaryStrip({ onCelebrate }: { onCelebrate?: (a: { name: string; years: number; date: string; tenure: string }) => void }) {
  const A = BRYTE_DATA.ANNIVERSARIES;
  return (
    <div style={{ background: 'var(--b-forest-pale)', border: '1px solid var(--b-forest-border)', borderRadius: 'var(--r-lg)', padding: '16px 22px', marginBottom: 22 }}>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 auto' }}>
          <div className="serif italic" style={{ fontSize: 'var(--t-xs)', color: 'var(--b-forest)', fontWeight: 600 }}>This week</div>
          <div className="serif" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--b-ink)', marginTop: 2 }}>🎂 Anniversaries</div>
        </div>
        <div className="row flex-wrap" style={{ gap: 8, flex: 1, justifyContent: 'flex-end' }}>
          {A.map(a => (
            <div key={a.name} className="row" style={{ gap: 8, background: 'var(--b-card)', padding: '6px 12px', borderRadius: 'var(--r-pill)', border: '1px solid var(--b-forest-border)' }}>
              <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--b-forest)' }}>{a.years}Y</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--b-ink)', fontWeight: 500 }}>{a.name}</span>
              <span className="muted" style={{ fontSize: 10 }}>· {a.date}</span>
              <button className="btn-text" style={{ fontSize: 10 }} onClick={() => onCelebrate?.(a)}>Celebrate →</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton + FeedSkeleton ────────────────────────────
export function Skeleton({ w = '100%', h = 16, br = 4, style }: { w?: string | number; h?: number; br?: number; style?: React.CSSProperties }) {
  return <div style={{ width: w, height: h, borderRadius: br, background: 'linear-gradient(90deg, var(--b-surface) 0%, var(--b-elevated) 50%, var(--b-surface) 100%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite', ...style }} />;
}

export function FeedSkeleton() {
  return (
    <div className="wall">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} className="rec-card" style={{ padding: 0 }}>
          <div style={{ height: 4, background: 'var(--b-border-soft)' }} />
          <div style={{ padding: '18px 20px' }}>
            <div className="row" style={{ gap: 10, marginBottom: 14 }}>
              <Skeleton w={36} h={36} br={18} />
              <div style={{ flex: 1 }}>
                <Skeleton w="60%" h={11} style={{ marginBottom: 6 }} />
                <Skeleton w="40%" h={9} />
              </div>
            </div>
            <Skeleton h={10} style={{ marginBottom: 6 }} />
            <Skeleton h={10} style={{ marginBottom: 6 }} />
            <Skeleton w="70%" h={10} style={{ marginBottom: 14 }} />
            <div className="row" style={{ gap: 8 }}>
              <Skeleton w={80} h={22} br={11} />
              <Skeleton w={60} h={22} br={11} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
