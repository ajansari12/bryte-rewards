import { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { BillingPanel, IntegrationsPanel } from './Additions';
import { ApprovalQueuePanel, OrgChartPanel } from './Extras';
import { useCurrentUser } from '@/lib/queries/users';
import { useLeaderboard } from '@/lib/queries/leaderboard';
import { useBadges } from '@/lib/queries/badges';
import { useRewards } from '@/lib/queries/rewards';
import { useWeeklyActivity, useValueBreakdown } from '@/lib/queries/analytics';
import { useOrgValues } from '@/lib/queries/values';
import { useRequestRedemption } from '@/lib/mutations/useRequestRedemption';

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
  const START = -225, SWEEP = 270;
  const trackPath = arcPath(CX, CY, R, START, START + SWEEP);
  const fillEnd = START + SWEEP * pct;
  const fillPath = arcPath(CX, CY, R, START, fillEnd);

  const fillRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(0);
  useEffect(() => {
    if (fillRef.current) setPathLen(fillRef.current.getTotalLength());
  }, []);

  const offset = ready && !rm() ? 0 : pathLen;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={180} height={180} viewBox="0 0 180 180" aria-hidden="true">
        <path d={trackPath} fill="none" stroke="var(--b-border)" strokeWidth={SW} strokeLinecap="round" />
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

  const xPos = (i: number) => PAD_L + (i / Math.max(weeks.length - 1, 1)) * chartW;
  const safeMax = max || 1;
  const yPos = (v: number) => PAD_T + chartH - (v / safeMax) * chartH;

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

  const ticks = [0, Math.round(safeMax / 2), safeMax];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {ticks.map(t => (
        <g key={t}>
          <line x1={PAD_L} y1={yPos(t)} x2={W - PAD_R} y2={yPos(t)} stroke="var(--b-border-soft)" strokeWidth={1} />
          <text x={PAD_L - 6} y={yPos(t) + 4} textAnchor="end" fontSize={9} fill="var(--b-ink-4)" fontFamily="var(--font-mono)">
            {t}
          </text>
        </g>
      ))}
      {weeks.map((w, i) => (
        <text key={w.label} x={xPos(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--b-ink-4)" fontFamily="var(--font-mono)">
          {w.label}
        </text>
      ))}
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
      {ready && weeks.map((w, i) => (
        <g key={w.label}>
          <circle cx={xPos(i)} cy={yPos(w.given)} r={3} fill="var(--b-forest)" style={{ animation: noAnim ? 'none' : `fade-in 200ms ${i * 40 + 1000}ms both` }} />
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
  const { data: currentUser } = useCurrentUser();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [scope, setScope] = useState<'team' | 'org' | 'me'>('org');
  const { data: entries = [], isLoading } = useLeaderboard(period);
  const [podiumReady, setPodiumReady] = useState(false);

  const top3 = entries.slice(0, 3);
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
  const myEntry = entries.find(e => e.user_id === currentUser?.id);

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

      {isLoading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--b-ink-4)' }}>Loading…</div>
      ) : entries.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✦</div>
          <div className="serif" style={{ fontWeight: 600 }}>No recognitions yet this {period}</div>
          <div className="muted" style={{ fontSize: 'var(--t-sm)', marginTop: 6 }}>Be the first to recognise a teammate.</div>
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="card" style={{ padding: '28px 24px 0', marginBottom: 18, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, paddingBottom: 0 }}>
              {podiumOrder.map((p, vi) => {
                if (!p) return null;
                const rank = podiumRanks[vi];
                const barH = podiumHeights[vi];
                const animatedH = podiumReady && !noAnim ? barH : 0;
                return (
                  <div key={p.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 120 }}>
                    <div style={{ fontSize: 22, color: crownColors[vi], marginBottom: 6, lineHeight: 1 }}>{crowns[vi]}</div>
                    <div className={`avatar lg role-${p.role}`} style={{ marginBottom: 8, width: 52, height: 52, fontSize: 18 }}>{initials(p.display_name)}</div>
                    <div className="serif" style={{ fontWeight: 600, fontSize: 'var(--t-sm)', textAlign: 'center', marginBottom: 2 }}>{p.display_name.split(' ')[0]}</div>
                    <div className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--b-gold)', fontWeight: 700, marginBottom: 8 }}>
                      {p.points.toLocaleString()}
                    </div>
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
          {entries.length > 3 && (
            <div className="card" style={{ overflow: 'hidden' }}>
              {entries.slice(3).map((p, i) => (
                <div key={p.user_id} className="row" style={{
                  padding: '14px 18px',
                  borderBottom: i < entries.length - 4 ? '1px solid var(--b-border-soft)' : 'none',
                  background: p.user_id === currentUser?.id ? 'var(--b-cream-2)' : 'transparent',
                  gap: 14,
                }}>
                  <div className="mono" style={{ width: 28, textAlign: 'center', color: 'var(--b-ink-4)', fontWeight: 700 }}>
                    {i + 4}
                  </div>
                  <div className={`avatar md role-${p.role}`}>{initials(p.display_name)}</div>
                  <div className="grow">
                    <div className="serif" style={{ fontWeight: 600 }}>{p.display_name}</div>
                    <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>{p.title}</div>
                  </div>
                  <div className="mono" style={{ fontWeight: 700, color: 'var(--b-gold)', minWidth: 60, textAlign: 'right' }}>
                    {p.points.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {myEntry && (
            <div className="muted" style={{ marginTop: 14, fontSize: 'var(--t-xs)', textAlign: 'center' }}>
              Rankings refresh hourly. Your rank: <strong>#{myEntry.rank}</strong> · {myEntry.points.toLocaleString()} pts
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── BadgesPage ─────────────────────────────────────────
export function BadgesPage({ onNominate }: { onNominate: (b: { name: string; icon: string; criteria?: string }) => void }) {
  const { data: badges = [], isLoading } = useBadges();
  const [filter, setFilter] = useState<string>('All');
  const cats = ['All', ...Array.from(new Set(badges.map(b => b.category)))];
  const filtered = filter === 'All' ? badges : badges.filter(b => b.category === filter);
  const earnedCount = badges.filter(b => b.awarded_at !== null).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Badges</h1>
          <div className="sub">
            {isLoading ? 'Loading…' : `${earnedCount} of ${badges.length} earned. Each one is a small story about who you've been.`}
          </div>
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
            opacity: b.awarded_at ? 1 : 0.55,
            textAlign: 'center',
            transition: 'transform .2s',
          }}>
            <div style={{ fontSize: 42, marginBottom: 8, filter: b.awarded_at ? 'none' : 'grayscale(.7)' }}>{b.icon}</div>
            <div className="serif" style={{ fontWeight: 600, fontSize: '1rem' }}>{b.name}</div>
            <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 4 }}>{b.category}</div>
            {b.criteria && <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 8, lineHeight: 1.4, fontStyle: 'italic' }}>{b.criteria}</div>}
            {b.awarded_at ? (
              <div className="mono" style={{ fontSize: 'var(--t-xs)', color: 'var(--b-gold)', marginTop: 10, fontWeight: 600 }}>
                Earned · {new Date(b.awarded_at).toLocaleDateString()}
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
  const { data: currentUser } = useCurrentUser();
  const { data: rewards = [], isLoading } = useRewards();
  const requestRedemption = useRequestRedemption();
  const [tab, setTab] = useState<'gift' | 'experience' | 'donate'>('gift');

  const myPoints = currentUser?.points ?? 0;

  const handleRedeem = async (rewardId: string, title: string, points: number) => {
    if (!currentUser) return;
    if (points > myPoints) {
      onToast({ kind: 'info', msg: `You'll need ${(points - myPoints).toLocaleString()} more pts for ${title}` });
      return;
    }
    try {
      await requestRedemption.mutateAsync({ reward_id: rewardId, user_id: currentUser.id });
      onConfetti();
      onToast({ kind: 'success', msg: `${title} redeemed — check your email ✦` });
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Redemption failed' });
    }
  };

  const giftRewards = rewards.filter(r => r.kind === 'gift');
  const experienceRewards = rewards.filter(r => r.kind === 'experience');
  const donateRewards = rewards.filter(r => r.kind === 'donate');

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Rewards</h1>
          <div className="sub">You've earned <strong style={{ color: 'var(--b-gold)' }}>{myPoints.toLocaleString()} pts</strong>. Spend them on something that matters to you.</div>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 22 }}>
        <button className={'chip' + (tab === 'gift' ? ' chip-active' : '')} onClick={() => setTab('gift')}>Gift cards</button>
        <button className={'chip' + (tab === 'experience' ? ' chip-active' : '')} onClick={() => setTab('experience')}>Experiences</button>
        <button className={'chip' + (tab === 'donate' ? ' chip-active' : '')} onClick={() => setTab('donate')}>Donate</button>
      </div>

      {isLoading ? (
        <div className="muted" style={{ textAlign: 'center', padding: 40 }}>Loading…</div>
      ) : (
        <>
          {tab === 'gift' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {giftRewards.map(r => (
                <div key={r.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ background: r.color, color: 'white', padding: '24px 16px', textAlign: 'center' }}>
                    <div className="serif" style={{ fontWeight: 600, marginTop: 6 }}>{r.brand}</div>
                    <div className="mono" style={{ fontSize: 'var(--t-xs)', opacity: 0.85, marginTop: 2 }}>{r.denom}</div>
                  </div>
                  <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="mono" style={{ color: 'var(--b-gold)', fontWeight: 700 }}>{r.points.toLocaleString()} pts</div>
                    <button className="btn btn-primary btn-sm" disabled={r.points > myPoints || requestRedemption.isPending} onClick={() => handleRedeem(r.id, r.title, r.points)}>
                      {r.points > myPoints ? 'Locked' : 'Redeem'}
                    </button>
                  </div>
                </div>
              ))}
              {giftRewards.length === 0 && <div className="muted" style={{ padding: 20 }}>No gift cards available yet.</div>}
            </div>
          )}

          {(tab === 'experience' || tab === 'donate') && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {(tab === 'experience' ? experienceRewards : donateRewards).map(r => (
                <div key={r.id} className="card" style={{ padding: 18 }}>
                  <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 'var(--r-md)', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                      ✦
                    </div>
                    <div className="grow">
                      <div className="serif" style={{ fontWeight: 600 }}>{r.title}</div>
                      <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 4, lineHeight: 1.5 }}>{r.brand}</div>
                    </div>
                  </div>
                  <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
                    <div className="mono" style={{ color: 'var(--b-gold)', fontWeight: 700 }}>{r.points.toLocaleString()} pts</div>
                    <button className="btn btn-primary btn-sm" disabled={r.points > myPoints || requestRedemption.isPending} onClick={() => handleRedeem(r.id, r.title, r.points)}>
                      {r.points > myPoints ? 'Locked' : 'Request'}
                    </button>
                  </div>
                </div>
              ))}
              {(tab === 'experience' ? experienceRewards : donateRewards).length === 0 && (
                <div className="muted" style={{ padding: 20 }}>No {tab} rewards available yet.</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── ManagerPage ────────────────────────────────────────
import { useDirectReports } from '@/lib/queries/users';

export function ManagerPage({ onRecognize }: { onRecognize: () => void }) {
  const { data: reports = [], isLoading } = useDirectReports();
  const teamSize = reports.length;
  const initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('');

  const recognized = reports.filter(r => r.points > 0).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Team pulse</h1>
          <div className="sub">
            {isLoading ? 'Loading…' : `${recognized}/${teamSize} of your team got recognised this month.`}
          </div>
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
          <div className="label">Team members</div>
          <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: 6, color: 'var(--b-forest)' }}>{teamSize}</div>
          <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>direct reports</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div className="label">Team participation</div>
          <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: 6, color: 'var(--b-gold)' }}>
            {teamSize > 0 ? Math.round((recognized / teamSize) * 100) : 0}%
          </div>
          <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>recognised this period</div>
        </div>
        <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <CultureRing pct={teamSize > 0 ? recognized / teamSize : 0} label="participation" />
          <div className="muted" style={{ fontSize: 'var(--t-xs)', textAlign: 'center', marginTop: 4, lineHeight: 1.4, maxWidth: 120 }}>
            Team recognition rate ✦
          </div>
        </div>
      </div>

      <h2 className="serif" style={{ fontSize: '1.1rem', fontWeight: 600, margin: '24px 0 12px' }}>Your direct reports</h2>

      {isLoading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--b-ink-4)' }}>Loading…</div>
      ) : reports.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div className="muted">No direct reports found. Make sure your team members have you set as their manager.</div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {reports.map((p, i) => (
            <div key={p.id} className="row" style={{ padding: 16, gap: 14, borderBottom: i < reports.length - 1 ? '1px solid var(--b-border-soft)' : 'none' }}>
              <div className={`avatar md role-${p.role}`}>{initials(p.display_name)}</div>
              <div className="grow">
                <div className="serif" style={{ fontWeight: 600 }}>{p.display_name}</div>
                <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>
                  {p.title}
                  {p.start_date && ` · since ${new Date(p.start_date).getFullYear()}`}
                  {` · ${p.points.toLocaleString()} pts`}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={onRecognize}>Recognise</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <OrgChartPanel />
      </div>
    </div>
  );
}

// ─── AnalyticsPage ──────────────────────────────────────
export function AnalyticsPage() {
  const { data: weeklyData = [], isLoading: loadingWeekly } = useWeeklyActivity();
  const { data: valueData = [], isLoading: loadingValues } = useValueBreakdown();

  const max = Math.max(...weeklyData.flatMap(w => [w.given, w.received]), 1);

  // Fallback placeholder weeks while loading
  const weeks = weeklyData.length > 0
    ? weeklyData
    : Array.from({ length: 12 }, (_, i) => ({ label: `W${i + 1}`, given: 0, received: 0 }));

  const valueDist = valueData.length > 0 ? valueData : [];

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
          { label: 'Total recognitions', val: weeklyData.reduce((s, w) => s + w.given + w.received, 0).toString(), sub: 'last 12 weeks' },
          { label: 'Given by you', val: weeklyData.reduce((s, w) => s + w.given, 0).toString(), sub: 'recognitions sent' },
          { label: 'Received by you', val: weeklyData.reduce((s, w) => s + w.received, 0).toString(), sub: 'recognitions received' },
          { label: 'Values tracked', val: valueData.length.toString(), sub: 'distinct values' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 16 }}>
            <div className="label">{s.label}</div>
            <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: 6 }}>
              {loadingWeekly ? '—' : s.val}
            </div>
            <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 18 }}>
        <h3 className="serif" style={{ fontWeight: 600, marginBottom: 16 }}>12 weeks of recognition</h3>
        {loadingWeekly ? (
          <div className="muted" style={{ textAlign: 'center', padding: 20 }}>Loading…</div>
        ) : (
          <ParticipationChart weeks={weeks} max={max} />
        )}
        <div className="row" style={{ gap: 18, marginTop: 14, fontSize: 'var(--t-xs)' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--b-forest)', borderRadius: 2, marginRight: 6 }} />Given</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--b-gold)', borderRadius: 2, marginRight: 6 }} />Received</span>
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <h3 className="serif" style={{ fontWeight: 600, marginBottom: 16 }}>Value distribution</h3>
        {loadingValues ? (
          <div className="muted" style={{ textAlign: 'center', padding: 20 }}>Loading…</div>
        ) : valueDist.length === 0 ? (
          <div className="muted" style={{ padding: 20 }}>No recognitions with values yet.</div>
        ) : (
          <ValueBreakdownChart values={valueDist} />
        )}
      </div>
    </div>
  );
}

// ─── AdminPage ──────────────────────────────────────────
export function AdminPage({ onToast, onOpenKudos }: { onToast: (t: Toast) => void; onOpenKudos: () => void }) {
  const { data: orgValues = [] } = useOrgValues();
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
          {orgValues.length === 0 ? (
            <div className="muted" style={{ padding: 20, textAlign: 'center' }}>No values configured yet.</div>
          ) : orgValues.map(v => (
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
