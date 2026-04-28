import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from './Icon';
import { BRYTE_DATA } from '@/lib/data';
import { BillingPanel, IntegrationsPanel } from './Additions';
import { ApprovalQueuePanel, OrgChartPanel } from './Extras';

type Toast = { kind?: 'success' | 'error' | 'info'; msg: string };

const rm = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── SVG arc helper ─────────────────────────────────────
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

// ─── CultureRing ─────────────────────────────────────────
function CultureRing({ pct, label }: { pct: number; label: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 120);
    return () => clearTimeout(t);
  }, []);

  const CX = 90, CY = 90, R = 70, SW = 10;
  // 270-degree sweep: start at -225deg (-135deg from standard), end at +45deg
  const START = -225, SWEEP = 270;
  const trackPath = arcPath(CX, CY, R, START, START + SWEEP);
  // fill arc length proportional to pct
  const fillEnd = START + SWEEP * pct;
  const fillPath = arcPath(CX, CY, R, START, fillEnd);

  // measure fill path length for dashoffset animation
  const fillRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(0);
  useEffect(() => {
    if (fillRef.current) setPathLen(fillRef.current.getTotalLength());
  }, []);

  const offset = ready && !rm() ? 0 : pathLen;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={180} height={180} viewBox="0 0 180 180" aria-hidden="true">
        {/* Track */}
        <path d={trackPath} fill="none" stroke="var(--b-border)" strokeWidth={SW} strokeLinecap="round" />
        {/* Fill */}
        <path
          ref={fillRef}
          d={fillPath}
          fill="none"
          stroke="var(--b-gold)"
          strokeWidth={SW}
          strokeLinecap="round"
          strokeDasharray={pathLen || undefined}
          strokeDashoffset={pathLen ? offset : undefined}
          style={{ transition: rm() ? 'none' : 'stroke-dashoffset 1100ms cubic-bezier(0.4,0,0.2,1)' }}
        />
        {/* Centre label */}
        <text x={CX} y={CY - 8} textAnchor="middle" fontFamily="var(--font-display)" fontWeight={700} fontSize={28} fill="var(--b-gold)">
          {Math.round(pct * 100)}%
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle" fontFamily="var(--font-ui)" fontSize={11} fill="var(--b-ink-3)">
          {label}
        </text>
      </svg>
    </div>
  );
}

// ─── ParticipationChart ──────────────────────────────────
function ParticipationChart({ weeks, max }: { weeks: { label: string; given: number; received: number }[]; max: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  const W = 560, H = 140, PAD_L = 32, PAD_R = 16, PAD_T = 8, PAD_B = 24;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const xPos = (i: number) => PAD_L + (i / (weeks.length - 1)) * chartW;
  const yPos = (v: number) => PAD_T + chartH - (v / max) * chartH;

  const givenPts = weeks.map((w, i) => `${xPos(i)},${yPos(w.given)}`).join(' ');
  const recvPts = weeks.map((w, i) => `${xPos(i)},${yPos(w.received)}`).join(' ');

  const givenRef = useRef<SVGPolylineElement>(null);
  const recvRef = useRef<SVGPolylineElement>(null);
  const [givenLen, setGivenLen] = useState(0);
  const [recvLen, setRecvLen] = useState(0);
  useEffect(() => {
    if (givenRef.current) setGivenLen(givenRef.current.getTotalLength());
    if (recvRef.current) setRecvLen(recvRef.current.getTotalLength());
  }, []);

  const noAnim = rm();
  const givenOffset = ready && !noAnim ? 0 : givenLen;
  const recvOffset = ready && !noAnim ? 0 : recvLen;

  // Y-axis ticks
  const ticks = [0, Math.round(max / 2), max];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {/* Grid lines */}
      {ticks.map(t => (
        <g key={t}>
          <line x1={PAD_L} y1={yPos(t)} x2={W - PAD_R} y2={yPos(t)} stroke="var(--b-border-soft)" strokeWidth={1} />
          <text x={PAD_L - 6} y={yPos(t) + 4} textAnchor="end" fontSize={9} fill="var(--b-ink-4)" fontFamily="var(--font-mono)">
            {t}
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {weeks.map((w, i) => (
        <text key={w.label} x={xPos(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--b-ink-4)" fontFamily="var(--font-mono)">
          {w.label}
        </text>
      ))}

      {/* Given line */}
      <polyline
        ref={givenRef}
        points={givenPts}
        fill="none"
        stroke="var(--b-forest)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={givenLen || undefined}
        strokeDashoffset={givenLen ? givenOffset : undefined}
        style={{ transition: noAnim ? 'none' : 'stroke-dashoffset 1200ms cubic-bezier(0.4,0,0.2,1)' }}
      />

      {/* Received line */}
      <polyline
        ref={recvRef}
        points={recvPts}
        fill="none"
        stroke="var(--b-gold)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={recvLen || undefined}
        strokeDashoffset={recvLen ? recvOffset : undefined}
        style={{ transition: noAnim ? 'none' : 'stroke-dashoffset 1200ms 100ms cubic-bezier(0.4,0,0.2,1)' }}
      />

      {/* Dots (appear when ready) */}
      {ready && weeks.map((w, i) => (
        <g key={w.label}>
          <circle cx={xPos(i)} cy={yPos(w.given)} r={3} fill="var(--b-forest)" style={{ opacity: noAnim ? 1 : undefined, animation: noAnim ? 'none' : `fade-in 200ms ${i * 40 + 1000}ms both` }} />
          <circle cx={xPos(i)} cy={yPos(w.received)} r={3} fill="var(--b-gold)" style={{ animation: noAnim ? 'none' : `fade-in 200ms ${i * 40 + 1100}ms both` }} />
        </g>
      ))}
    </svg>
  );
}

// ─── ValueBreakdownChart ─────────────────────────────────
function ValueBreakdownChart({ values }: { values: { name: string; pct: number; color: string }[] }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);
  const noAnim = rm();

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {values.map((v, i) => (
        <div key={v.name}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 'var(--t-sm)', color: 'var(--b-ink-2)' }}>{v.name}</span>
            <span className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--b-ink-4)', fontWeight: 600 }}>{v.pct}%</span>
          </div>
          <div className="progress-linear" style={{ height: 8, borderRadius: 4 }}>
            <div
              className="fill"
              style={{
                width: ready ? `${v.pct}%` : '0%',
                background: v.color,
                transition: noAnim ? 'none' : `width 700ms ${i * 80}ms cubic-bezier(0.4,0,0.2,1)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── LeaderboardPage ───────────────────────────────────
export function LeaderboardPage() {
  const data = (BRYTE_DATA as any).LEADERBOARD as Array<{
    name: string; role: string; title: string; points: number; change: number; topValue: string;
  }>;
  const [scope, setScope] = useState<'team' | 'org' | 'me'>('org');
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [podiumReady, setPodiumReady] = useState(false);

  const me = BRYTE_DATA.CURRENT_USER;
  const myIndex = 5;
  const top3 = data.slice(0, 3);
  // Visual order: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]];
  const podiumHeights = [80, 120, 60];
  const crowns = ['♚', '♛', '♜'];
  const crownColors = ['var(--b-ink-3)', 'var(--b-gold)', 'var(--b-gold-light)'];
  const podiumRanks = [2, 1, 3];

  useEffect(() => {
    const t = setTimeout(() => setPodiumReady(true), 100);
    return () => clearTimeout(t);
  }, []);
  const noAnim = rm();

  const initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('');

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

      <div className="row" style={{ gap: 8, marginBottom: 28 }}>
        {(['team', 'org', 'me'] as const).map(s => (
          <button key={s} className={'chip' + (scope === s ? ' chip-active' : '')} onClick={() => setScope(s)}>
            {s === 'team' ? 'My team' : s === 'org' ? 'Whole org' : 'My rank'}
          </button>
        ))}
      </div>

      {/* Podium */}
      <div className="card" style={{ padding: '28px 24px 0', marginBottom: 18, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, paddingBottom: 0 }}>
          {podiumOrder.map((p, vi) => {
            if (!p) return null;
            const rank = podiumRanks[vi];
            const barH = podiumHeights[vi];
            const animatedH = podiumReady && !noAnim ? barH : 0;
            return (
              <div key={p.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 120 }}>
                {/* Crown */}
                <div style={{ fontSize: 22, color: crownColors[vi], marginBottom: 6, lineHeight: 1 }}>{crowns[vi]}</div>
                {/* Avatar */}
                <div className={`avatar lg role-${p.role}`} style={{ marginBottom: 8, width: 52, height: 52, fontSize: 18 }}>{initials(p.name)}</div>
                <div className="serif" style={{ fontWeight: 600, fontSize: 'var(--t-sm)', textAlign: 'center', marginBottom: 2 }}>{p.name.split(' ')[0]}</div>
                <div className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--b-gold)', fontWeight: 700, marginBottom: 8 }}>
                  {p.points.toLocaleString()}
                </div>
                {/* Podium bar */}
                <div style={{
                  width: '100%',
                  height: animatedH,
                  minHeight: 0,
                  background: rank === 1
                    ? 'linear-gradient(180deg, var(--b-gold) 0%, var(--b-gold-border) 100%)'
                    : rank === 2
                    ? 'linear-gradient(180deg, var(--b-ink-3) 0%, var(--b-ink-4) 100%)'
                    : 'linear-gradient(180deg, var(--b-gold-light) 0%, var(--b-border-heavy) 100%)',
                  borderRadius: '6px 6px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: noAnim ? 'none' : `height 700ms ${vi * 100}ms cubic-bezier(0.4,0,0.2,1)`,
                }}>
                  <span className="serif" style={{ fontSize: '1.2rem', fontWeight: 700, color: rank === 1 ? 'var(--b-ink)' : 'var(--b-canvas)', opacity: animatedH > 30 ? 1 : 0, transition: 'opacity 200ms' }}>
                    {rank}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rest of rankings */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {data.slice(3).map((p, i) => (
          <div key={p.name} className="row" style={{
            padding: '14px 18px',
            borderBottom: i < data.length - 4 ? '1px solid var(--b-border-soft)' : 'none',
            background: p.name === me.displayName ? 'var(--b-cream-2)' : 'transparent',
            gap: 14,
          }}>
            <div className="mono" style={{ width: 28, textAlign: 'center', color: 'var(--b-ink-4)', fontWeight: 700 }}>
              {i + 4}
            </div>
            <div className={`avatar md role-${p.role}`}>{initials(p.name)}</div>
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
  const initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('');

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
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
        {/* CultureRing card */}
        <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <CultureRing pct={0.92} label="participation" />
          <div className="muted" style={{ fontSize: 'var(--t-xs)', textAlign: 'center', marginTop: 4, lineHeight: 1.4, maxWidth: 120 }}>
            Team is above the 80% org benchmark ✦
          </div>
        </div>
      </div>

      <h2 className="serif" style={{ fontSize: '1.1rem', fontWeight: 600, margin: '24px 0 12px' }}>Your direct reports</h2>
      <div className="card" style={{ overflow: 'hidden' }}>
        {myReports.map((p, i) => {
          const noRecogDays = i % 3 === 0 ? 32 : i * 4 + 5;
          const stale = noRecogDays > 30;
          return (
            <div key={p.name} className="row" style={{ padding: 16, gap: 14, borderBottom: i < myReports.length - 1 ? '1px solid var(--b-border-soft)' : 'none' }}>
              <div className={`avatar md role-${p.role}`}>{initials(p.name)}</div>
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
    { name: 'Patient First', pct: 32, color: 'var(--b-terra)' },
    { name: 'Team Lift', pct: 24, color: 'var(--b-forest)' },
    { name: 'Clinical Excellence', pct: 18, color: 'var(--b-gold)' },
    { name: 'Compassion', pct: 14, color: '#D05A3B' },
    { name: 'Safety First', pct: 12, color: 'var(--b-ink-2)' },
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
        <ParticipationChart weeks={weeks} max={max} />
        <div className="row" style={{ gap: 18, marginTop: 14, fontSize: 'var(--t-xs)' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--b-forest)', borderRadius: 2, marginRight: 6 }} />Given</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--b-gold)', borderRadius: 2, marginRight: 6 }} />Received</span>
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <h3 className="serif" style={{ fontWeight: 600, marginBottom: 16 }}>Value distribution</h3>
        <ValueBreakdownChart values={valueDist} />
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
