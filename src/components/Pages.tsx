'use client';

import { useState, useMemo } from 'react';
import { Icon } from './Icon';
import { BRYTE_DATA } from '@/lib/data';
import { BillingPanel, IntegrationsPanel } from './Additions';
import { ApprovalQueuePanel, OrgChartPanel } from './Extras';

type Toast = { kind?: 'success' | 'error' | 'info'; msg: string };

// ─── LeaderboardPage ───────────────────────────────────
export function LeaderboardPage() {
  const data = (BRYTE_DATA as any).LEADERBOARD as Array<{
    name: string; role: string; title: string; points: number; change: number; topValue: string;
  }>;
  const [scope, setScope] = useState<'team' | 'org' | 'me'>('org');
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  const me = BRYTE_DATA.CURRENT_USER;
  const myIndex = 5;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Leaderboard</h1>
          <div className="sub">Recognition isn't a contest — but momentum is real. Here's who's lifting whom.</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="seg">
            {(['week', 'month', 'quarter'] as const).map(p => (
              <button key={p} className={'seg-btn' + (period === p ? ' active' : '')} onClick={() => setPeriod(p)}>
                {p === 'week' ? 'This week' : p === 'month' ? 'This month' : 'This quarter'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 20 }}>
        {(['team', 'org', 'me'] as const).map(s => (
          <button key={s} className={'chip' + (scope === s ? ' chip-active' : '')} onClick={() => setScope(s)}>
            {s === 'team' ? 'My team' : s === 'org' ? 'Whole org' : 'My rank'}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {data.map((p, i) => (
          <div key={p.name} className="row" style={{
            padding: '14px 18px',
            borderBottom: i < data.length - 1 ? '1px solid var(--b-border-soft)' : 'none',
            background: p.name === me.displayName ? 'var(--b-cream-2)' : 'transparent',
            gap: 14,
          }}>
            <div className="mono" style={{ width: 28, textAlign: 'center', color: i < 3 ? 'var(--b-gold)' : 'var(--b-ink-4)', fontWeight: 700 }}>
              {i + 1}
            </div>
            <div className={`avatar md role-${p.role}`}>{p.name.split(' ').map(s => s[0]).join('').slice(0, 2)}</div>
            <div className="grow">
              <div className="serif" style={{ fontWeight: 600 }}>{p.name}</div>
              <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>{p.title} · {p.topValue}</div>
            </div>
            <div className="row" style={{ gap: 6, fontSize: 'var(--t-xs)', color: p.change > 0 ? 'var(--b-forest)' : p.change < 0 ? 'var(--b-terra)' : 'var(--b-ink-4)' }}>
              {p.change > 0 ? <Icon name="up" size={12} /> : p.change < 0 ? <Icon name="down" size={12} /> : null}
              <span>{p.change === 0 ? '—' : Math.abs(p.change)}</span>
            </div>
            <div className="mono" style={{ fontWeight: 700, color: 'var(--b-gold)', minWidth: 60, textAlign: 'right' }}>
              {p.points.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="muted" style={{ marginTop: 14, fontSize: 'var(--t-xs)', textAlign: 'center' }}>
        Rankings refresh hourly. Your rank: <strong>#{myIndex + 1}</strong> · {me.points.toLocaleString()} pts
      </div>
    </div>
  );
}

// ─── BadgesPage ─────────────────────────────────────────
export function BadgesPage({ onNominate }: { onNominate: (b: { name: string; icon: string; criteria?: string }) => void }) {
  const badges = (BRYTE_DATA as any).BADGES as Array<{
    id: string; name: string; icon: string; category: string; earned: boolean; date?: string; criteria?: string;
  }>;
  const [filter, setFilter] = useState<string>('All');
  const cats = ['All', ...Array.from(new Set(badges.map(b => b.category)))];
  const filtered = filter === 'All' ? badges : badges.filter(b => b.category === filter);
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Badges</h1>
          <div className="sub">{earnedCount} of {badges.length} earned. Each one is a small story about who you've been.</div>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {cats.map(c => (
          <button key={c} className={'chip' + (filter === c ? ' chip-active' : '')} onClick={() => setFilter(c)}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {filtered.map(b => (
          <div key={b.id} className="card" style={{
            padding: 18,
            opacity: b.earned ? 1 : 0.55,
            textAlign: 'center',
            transition: 'transform .2s',
          }}>
            <div style={{ fontSize: 42, marginBottom: 8, filter: b.earned ? 'none' : 'grayscale(.7)' }}>{b.icon}</div>
            <div className="serif" style={{ fontWeight: 600, fontSize: '1rem' }}>{b.name}</div>
            <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 4 }}>{b.category}</div>
            {b.criteria && <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 8, lineHeight: 1.4, fontStyle: 'italic' }}>{b.criteria}</div>}
            {b.earned ? (
              <div className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--b-gold)', marginTop: 10, fontWeight: 600 }}>
                Earned · {b.date}
              </div>
            ) : (
              <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 10 }} onClick={() => onNominate({ name: b.name, icon: b.icon, criteria: b.criteria })}>
                Nominate someone
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RewardsPage ────────────────────────────────────────
export function RewardsPage({ onToast, onConfetti }: { onToast: (t: Toast) => void; onConfetti: () => void }) {
  const me = BRYTE_DATA.CURRENT_USER;
  const rewards = (BRYTE_DATA as any).REWARDS as Array<{ title: string; brand: string; icon: string; denom: string; points: number; color: string }>;
  const custom = (BRYTE_DATA as any).CUSTOM_REWARDS as Array<{ title: string; points: number; icon: string; color: string; kind: string; desc: string }>;
  const [tab, setTab] = useState<'gift' | 'experience' | 'donate'>('gift');

  const handleRedeem = (title: string, points: number) => {
    if (points > me.points) {
      onToast({ kind: 'info', msg: `You'll need ${(points - me.points).toLocaleString()} more pts for ${title}` });
      return;
    }
    onConfetti();
    onToast({ kind: 'success', msg: `${title} redeemed — check your email ✦` });
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Rewards</h1>
          <div className="sub">You've earned <strong style={{ color: 'var(--b-gold)' }}>{me.points.toLocaleString()} pts</strong>. Spend them on something that matters to you.</div>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 22 }}>
        <button className={'chip' + (tab === 'gift' ? ' chip-active' : '')} onClick={() => setTab('gift')}>Gift cards</button>
        <button className={'chip' + (tab === 'experience' ? ' chip-active' : '')} onClick={() => setTab('experience')}>Experiences</button>
        <button className={'chip' + (tab === 'donate' ? ' chip-active' : '')} onClick={() => setTab('donate')}>Donate</button>
      </div>

      {tab === 'gift' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {rewards.map(r => (
            <div key={r.title} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: r.color, color: 'white', padding: '24px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32 }}>{r.icon}</div>
                <div className="serif" style={{ fontWeight: 600, marginTop: 6 }}>{r.brand}</div>
                <div className="mono" style={{ fontSize: 'var(--t-xs)', opacity: 0.85, marginTop: 2 }}>{r.denom}</div>
              </div>
              <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="mono" style={{ color: 'var(--b-gold)', fontWeight: 700 }}>{r.points.toLocaleString()} pts</div>
                <button className="btn btn-primary btn-sm" disabled={r.points > me.points} onClick={() => handleRedeem(r.title, r.points)}>
                  {r.points > me.points ? 'Locked' : 'Redeem'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(tab === 'experience' || tab === 'donate') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {custom.filter(c => c.kind === tab).map(c => (
            <div key={c.title} className="card" style={{ padding: 18 }}>
              <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--r-md)', background: c.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{c.icon}</div>
                <div className="grow">
                  <div className="serif" style={{ fontWeight: 600 }}>{c.title}</div>
                  <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 4, lineHeight: 1.5 }}>{c.desc}</div>
                </div>
              </div>
              <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
                <div className="mono" style={{ color: 'var(--b-gold)', fontWeight: 700 }}>{c.points.toLocaleString()} pts</div>
                <button className="btn btn-primary btn-sm" disabled={c.points > me.points} onClick={() => handleRedeem(c.title, c.points)}>
                  {c.points > me.points ? 'Locked' : 'Request'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ManagerPage ────────────────────────────────────────
export function ManagerPage({ onRecognize }: { onRecognize: () => void }) {
  const tree = (BRYTE_DATA as any).ORG_TREE;
  const myReports = tree.reports[0].reports as Array<{ name: string; role: string; title: string; tenure: string; points: number }>;
  const teamSize = myReports.length;
  const recognized = Math.round(teamSize * 0.75);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Team pulse</h1>
          <div className="sub">{recognized}/{teamSize} of your team got recognised this month. Two haven't in 30+ days.</div>
        </div>
        <button className="btn btn-primary" onClick={onRecognize}>
          <Icon name="sparkle" size={14} /> Recognise someone
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="label">This month</div>
          <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: 6 }}>{recognized}<span style={{ color: 'var(--b-ink-4)', fontSize: '1rem', fontWeight: 400 }}>/{teamSize}</span></div>
          <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>recognised at least once</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div className="label">Sent by you</div>
          <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: 6, color: 'var(--b-forest)' }}>14</div>
          <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>+3 vs last month</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div className="label">Team participation</div>
          <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: 6, color: 'var(--b-gold)' }}>92%</div>
          <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>gave or received</div>
        </div>
      </div>

      <h2 className="serif" style={{ fontSize: '1.1rem', fontWeight: 600, margin: '24px 0 12px' }}>Your direct reports</h2>
      <div className="card" style={{ overflow: 'hidden' }}>
        {myReports.map((p, i) => {
          const noRecogDays = i % 3 === 0 ? 32 : i * 4 + 5;
          const stale = noRecogDays > 30;
          return (
            <div key={p.name} className="row" style={{ padding: 16, gap: 14, borderBottom: i < myReports.length - 1 ? '1px solid var(--b-border-soft)' : 'none' }}>
              <div className={`avatar md role-${p.role}`}>{p.name.split(' ').map(s => s[0]).join('').slice(0, 2)}</div>
              <div className="grow">
                <div className="serif" style={{ fontWeight: 600 }}>{p.name}</div>
                <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>{p.title} · {p.tenure} · {p.points.toLocaleString()} pts</div>
              </div>
              <div style={{ fontSize: 'var(--t-xs)', color: stale ? 'var(--b-terra)' : 'var(--b-ink-4)' }}>
                {stale ? `${noRecogDays}d since recognition` : `${noRecogDays}d ago`}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={onRecognize}>Recognise</button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 28 }}>
        <OrgChartPanel />
      </div>
    </div>
  );
}

// ─── AnalyticsPage ──────────────────────────────────────
export function AnalyticsPage() {
  const weeks = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    label: `W${i + 1}`,
    given: 18 + Math.round(Math.sin(i * 0.6) * 6 + i * 0.8),
    received: 16 + Math.round(Math.cos(i * 0.5) * 5 + i * 0.6),
  })), []);
  const max = Math.max(...weeks.flatMap(w => [w.given, w.received]));

  const valueDist = [
    { name: 'Patient First', pct: 32, color: '#7C2D2D' },
    { name: 'Team Lift', pct: 24, color: '#2C5F4A' },
    { name: 'Clinical Excellence', pct: 18, color: '#C2882D' },
    { name: 'Compassion', pct: 14, color: '#D05A3B' },
    { name: 'Safety First', pct: 12, color: '#1B3A4B' },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Analytics</h1>
          <div className="sub">Patterns, not personalities. Watch the shape of recognition over time.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total recognitions', val: '342', sub: '+18% MoM' },
          { label: 'Active recognisers', val: '47', sub: '76% of team' },
          { label: 'Avg per person', val: '7.3', sub: '+1.1 vs Q4' },
          { label: 'Points circulated', val: '14.3k', sub: '$716 redeemed' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 16 }}>
            <div className="label">{s.label}</div>
            <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: 6 }}>{s.val}</div>
            <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 18 }}>
        <h3 className="serif" style={{ fontWeight: 600, marginBottom: 16 }}>12 weeks of recognition</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180 }}>
          {weeks.map(w => (
            <div key={w.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', gap: 2, height: 150 }}>
                <div style={{ flex: 1, background: 'var(--b-forest)', height: `${(w.given / max) * 100}%`, borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
                <div style={{ flex: 1, background: 'var(--b-gold)', height: `${(w.received / max) * 100}%`, borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
              </div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--b-ink-4)' }}>{w.label}</div>
            </div>
          ))}
        </div>
        <div className="row" style={{ gap: 18, marginTop: 14, fontSize: 'var(--t-xs)' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--b-forest)', borderRadius: 2, marginRight: 6 }} />Given</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--b-gold)', borderRadius: 2, marginRight: 6 }} />Received</span>
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <h3 className="serif" style={{ fontWeight: 600, marginBottom: 16 }}>Value distribution</h3>
        {valueDist.map(v => (
          <div key={v.name} style={{ marginBottom: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 'var(--t-sm)' }}>{v.name}</span>
              <span className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--b-ink-4)' }}>{v.pct}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--b-cream-2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${v.pct * 3}%`, background: v.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AdminPage ──────────────────────────────────────────
export function AdminPage({ onToast, onOpenKudos }: { onToast: (t: Toast) => void; onOpenKudos: () => void }) {
  const [tab, setTab] = useState<'integrations' | 'billing' | 'approvals' | 'values' | 'budget' | 'export'>('integrations');

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin</h1>
          <div className="sub">Configure values, budgets, integrations. Export anything you need.</div>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {(['integrations', 'billing', 'approvals', 'values', 'budget', 'export'] as const).map(t => (
          <button key={t} className={'chip' + (tab === t ? ' chip-active' : '')} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'integrations' && <IntegrationsPanel />}
      {tab === 'billing' && <BillingPanel />}
      {tab === 'approvals' && <ApprovalQueuePanel onToast={onToast} />}

      {tab === 'values' && (
        <div className="card" style={{ padding: 22 }}>
          <h3 className="serif" style={{ fontWeight: 600, marginBottom: 12 }}>Company values</h3>
          <div className="muted" style={{ fontSize: 'var(--t-sm)', marginBottom: 18 }}>The behaviours your team gets recognised for. Each one carries a point value.</div>
          {Object.values(BRYTE_DATA.INDUSTRIES.healthcare.values).map(v => (
            <div key={v.id} className="row" style={{ padding: '12px 0', borderBottom: '1px solid var(--b-border-soft)', gap: 14 }}>
              <span style={{ fontSize: 22 }}>{v.icon}</span>
              <div className="grow">
                <div className="serif" style={{ fontWeight: 600 }}>{v.name}</div>
                <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>+{v.points} points per recognition</div>
              </div>
              <button className="btn btn-ghost btn-sm">Edit</button>
            </div>
          ))}
          <button className="btn btn-text btn-sm" style={{ marginTop: 14 }}>+ Add value</button>
        </div>
      )}

      {tab === 'budget' && (
        <div className="card" style={{ padding: 22 }}>
          <h3 className="serif" style={{ fontWeight: 600, marginBottom: 12 }}>Recognition budget</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
            <div>
              <div className="label">Quarterly pool</div>
              <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 4 }}>CA$24,000</div>
            </div>
            <div>
              <div className="label">Spent</div>
              <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 4, color: 'var(--b-forest)' }}>CA$8,420</div>
            </div>
            <div>
              <div className="label">Remaining</div>
              <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 4, color: 'var(--b-gold)' }}>CA$15,580</div>
            </div>
          </div>
          <div style={{ height: 14, background: 'var(--b-cream-2)', borderRadius: 7, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '35%', background: 'var(--b-forest)' }} />
          </div>
          <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 8 }}>35% spent · 62 days remaining in Q2</div>
        </div>
      )}

      {tab === 'export' && (
        <div className="card" style={{ padding: 22 }}>
          <h3 className="serif" style={{ fontWeight: 600, marginBottom: 12 }}>Export & print</h3>
          <div className="muted" style={{ fontSize: 'var(--t-sm)', marginBottom: 18 }}>Take recognition out of the app — onto walls, into reports, into archives.</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <button className="btn btn-ghost" onClick={onOpenKudos}>
              <Icon name="pen" size={14} /> Print kudos cards
            </button>
            <button className="btn btn-ghost" onClick={() => onToast({ kind: 'success', msg: 'CSV downloaded ✦' })}>
              <Icon name="arrow" size={14} /> Export recognitions (CSV)
            </button>
            <button className="btn btn-ghost" onClick={() => onToast({ kind: 'success', msg: 'PDF report queued ✦' })}>
              <Icon name="arrow" size={14} /> Quarterly PDF report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
