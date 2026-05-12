import { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { BillingPanel, IntegrationsPanel } from './Additions';
import { ApprovalQueuePanel, NominationApprovalsPanel, OrgChartPanel } from './Extras';
import { useCurrentUser, useCurrentOrg, useOrgUsers } from '@/lib/queries/users';
import { useLeaderboard } from '@/lib/queries/leaderboard';
import { useMonthlyVotes, useCastVote } from '@/lib/mutations/useCastVote';
import { useBadges, useAllBadges } from '@/lib/queries/badges';
import { useRewards, useAllRewards } from '@/lib/queries/rewards';
import { useUpdateRewards, type RewardDraft } from '@/lib/mutations/useUpdateRewards';
import { useUpdateBadges, type BadgeDraft } from '@/lib/mutations/useUpdateBadges';
import { useUpdateUserRole } from '@/lib/mutations/useUpdateUserRole';
import { useInviteTeammate } from '@/lib/mutations/useInviteTeammate';
import { usePendingInvites } from '@/lib/queries/pendingInvites';
import { useQueryClient } from '@tanstack/react-query';
import { useWeeklyActivity, useValueBreakdown } from '@/lib/queries/analytics';
import { useOrgValues } from '@/lib/queries/values';
import { useUpdateValues } from '@/lib/mutations/useUpdateValues';
import { useRecognitions } from '@/lib/queries/recognitions';
import { useRequestRedemption } from '@/lib/mutations/useRequestRedemption';
import { useQuarterlySpend, useQuarterlyPool } from '@/lib/queries/budget';
import { useOnboardingStatus } from '@/lib/queries/onboardingStatus';
import { qk } from '@/lib/queries/keys';
import { useUpdateOrg } from '@/lib/mutations/useUpdateOrg';
import { starterRewardsForIndustry } from '@/lib/onboardingPresets';
import { OnboardingChecklist, type AdminTabTarget as OCTabTarget } from './OnboardingChecklist';
import { BRYTE_DATA } from '@/lib/data';
import { supabase } from '@/lib/supabase';

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

// ─── TeammateOfMonth ───────────────────────────────────
function TeammateOfMonth() {
  const { data: currentUser } = useCurrentUser();
  const { data: orgUsers = [] } = useOrgUsers();
  const { data: votes = [] } = useMonthlyVotes();
  const castVote = useCastVote();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const myVote = votes.find(v => v.voter_id === currentUser?.id)?.nominee_id ?? null;

  const tallies = votes.reduce<Record<string, number>>((acc, v) => {
    acc[v.nominee_id] = (acc[v.nominee_id] ?? 0) + 1;
    return acc;
  }, {});
  const ranked = Object.entries(tallies)
    .map(([id, count]) => ({ id, count, user: orgUsers.find(u => u.id === id) }))
    .filter(x => x.user)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const totalVotes = votes.length;
  const orgSize = Math.max(orgUsers.length, 1);
  const participation = Math.round((new Set(votes.map(v => v.voter_id)).size / orgSize) * 100);

  const candidates = orgUsers
    .filter(u => u.id !== currentUser?.id)
    .filter(u => !search || u.display_name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8);

  const initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('');
  const monthLabel = new Date().toLocaleString(undefined, { month: 'long' });

  return (
    <div className="card" style={{ padding: 22, marginBottom: 18 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="label" style={{ color: 'var(--b-gold)', marginBottom: 4 }}>Teammate of the Month</div>
          <div className="serif" style={{ fontWeight: 600, fontSize: '1.05rem' }}>{monthLabel} · cast your vote</div>
          <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 4 }}>
            One vote per person. You can change it anytime before month-end.
          </div>
        </div>
        <div className="row" style={{ gap: 18 }}>
          <div style={{ textAlign: 'center' }}>
            <div className="mono" style={{ fontWeight: 700, color: 'var(--b-ink)' }}>{totalVotes}</div>
            <div className="label">votes</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="mono" style={{ fontWeight: 700, color: 'var(--b-forest)' }}>{participation}%</div>
            <div className="label">participation</div>
          </div>
        </div>
      </div>

      {ranked.length > 0 && (
        <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
          {ranked.map((r, i) => {
            if (!r.user) return null;
            const pct = Math.round((r.count / Math.max(totalVotes, 1)) * 100);
            const isLeader = i === 0;
            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px',
                background: isLeader ? 'var(--b-gold-pale)' : 'var(--b-surface)',
                border: `1px solid ${isLeader ? 'var(--b-gold-border)' : 'var(--b-border-soft)'}`,
                borderRadius: 'var(--r-md)',
              }}>
                <div className="mono" style={{ width: 22, textAlign: 'center', color: 'var(--b-ink-4)', fontWeight: 700 }}>{i + 1}</div>
                <div className={`avatar sm role-${r.user.role}`}>{initials(r.user.display_name)}</div>
                <div className="grow">
                  <div className="serif" style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{r.user.display_name}</div>
                  <div style={{ height: 4, background: 'var(--b-border-soft)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: isLeader ? 'var(--b-gold)' : 'var(--b-forest)', transition: 'width 400ms var(--ease)' }} />
                  </div>
                </div>
                <div className="mono" style={{ fontWeight: 600, color: isLeader ? 'var(--b-gold)' : 'var(--b-ink-3)', minWidth: 48, textAlign: 'right' }}>
                  {r.count} · {pct}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {myVote ? (
        <div className="row" style={{ justifyContent: 'space-between', padding: '10px 12px', background: 'var(--b-forest-pale)', border: '1px solid var(--b-forest-border)', borderRadius: 'var(--r-md)' }}>
          <div style={{ fontSize: 'var(--t-sm)' }}>
            You voted for{' '}
            <strong>{orgUsers.find(u => u.id === myVote)?.display_name ?? '—'}</strong>
          </div>
          <button className="btn-text btn-sm" onClick={() => setOpen(o => !o)}>
            {open ? 'Close' : 'Change vote'}
          </button>
        </div>
      ) : (
        <button className="btn btn-primary btn-sm" onClick={() => setOpen(o => !o)}>
          {open ? 'Close' : 'Cast your vote'}
        </button>
      )}

      {open && (
        <div style={{ marginTop: 12 }}>
          <input
            className="input"
            placeholder="Search teammates…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginTop: 10 }}>
            {candidates.map(u => (
              <button
                key={u.id}
                className="row"
                onClick={async () => {
                  await castVote.mutateAsync(u.id);
                  setOpen(false);
                  setSearch('');
                }}
                disabled={castVote.isPending}
                style={{
                  padding: 10, gap: 10, textAlign: 'left',
                  background: u.id === myVote ? 'var(--b-gold-pale)' : 'var(--b-card)',
                  border: `1px solid ${u.id === myVote ? 'var(--b-gold)' : 'var(--b-border)'}`,
                  borderRadius: 'var(--r-md)', cursor: 'pointer',
                }}
              >
                <div className={`avatar sm role-${u.role}`}>{initials(u.display_name)}</div>
                <div className="grow">
                  <div className="serif" style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{u.display_name}</div>
                  <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>{u.title || u.role}</div>
                </div>
                {u.id === myVote && <Icon name="check" size={14} style={{ color: 'var(--b-gold)' }} />}
              </button>
            ))}
            {candidates.length === 0 && (
              <div className="muted" style={{ padding: 16, textAlign: 'center', gridColumn: '1/-1' }}>No teammates match.</div>
            )}
          </div>
        </div>
      )}
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

      <TeammateOfMonth />

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
export function BadgesPage({ onNominate }: { onNominate: (b: { id: string; name: string; icon: string; criteria?: string }) => void }) {
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
              <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 10 }} onClick={() => onNominate({ id: b.id, name: b.name, icon: b.icon, criteria: b.criteria })}>
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
  const { data: recs = [] } = useRecognitions();
  const teamSize = reports.length;
  const initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('');

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartMs = monthStart.getTime();

  const recognizedThisMonthIds = new Set(
    recs
      .filter(r => new Date(r.created_at).getTime() >= monthStartMs)
      .map(r => r.recipient_id)
  );
  const recognized = reports.filter(r => recognizedThisMonthIds.has(r.id)).length;

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

// ─── BudgetPanel ────────────────────────────────────────
function BudgetPanel() {
  const { data: spent = 0, isLoading } = useQuarterlySpend();
  const pool = useQuarterlyPool();
  const remaining = Math.max(0, pool - spent);
  const pct = pool > 0 ? Math.min(100, Math.round((spent / pool) * 100)) : 0;

  const now = new Date();
  const qMonth = Math.floor(now.getMonth() / 3) * 3;
  const qEnd = new Date(now.getFullYear(), qMonth + 3, 0);
  const daysLeft = Math.max(0, Math.ceil((qEnd.getTime() - now.getTime()) / 86_400_000));
  const qLabel = `Q${Math.floor(now.getMonth() / 3) + 1}`;

  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 className="serif" style={{ fontWeight: 600, marginBottom: 12 }}>Recognition budget</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        <div>
          <div className="label">Quarterly pool</div>
          <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 4 }}>CA${pool.toLocaleString()}</div>
        </div>
        <div>
          <div className="label">Spent</div>
          <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 4, color: 'var(--b-forest)' }}>
            {isLoading ? '…' : `CA$${spent.toLocaleString()}`}
          </div>
        </div>
        <div>
          <div className="label">Remaining</div>
          <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 4, color: 'var(--b-gold)' }}>
            {isLoading ? '…' : `CA$${remaining.toLocaleString()}`}
          </div>
        </div>
      </div>
      <div style={{ height: 14, background: 'var(--b-cream-2)', borderRadius: 7, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--b-forest)', transition: 'width 400ms var(--ease)' }} />
      </div>
      <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 8 }}>{pct}% spent · {daysLeft} days remaining in {qLabel}</div>
    </div>
  );
}

// ─── ValuesEditor ───────────────────────────────────────
interface DraftValue {
  id?: string;
  name: string;
  icon: string;
  points: number;
  sort_order: number;
}

function ValuesEditor({ onToast }: { onToast: (t: Toast) => void }) {
  const { data: orgValues = [], isLoading, isError, refetch } = useOrgValues();
  const { data: currentUser } = useCurrentUser();
  const updateValues = useUpdateValues();
  const [drafts, setDrafts] = useState<DraftValue[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) {
      setDrafts(orgValues.map((v, i) => ({
        id: v.id, name: v.name, icon: v.icon, points: v.points, sort_order: v.sort_order ?? i,
      })));
    }
  }, [orgValues, dirty]);

  const update = (i: number, patch: Partial<DraftValue>) => {
    setDirty(true);
    setDrafts(arr => arr.map((v, idx) => idx === i ? { ...v, ...patch } : v));
  };

  const add = () => {
    setDirty(true);
    setDrafts(arr => [...arr, { name: 'New value', icon: '✦', points: 30, sort_order: arr.length }]);
  };

  const remove = (i: number) => {
    setDirty(true);
    setDrafts(arr => arr.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    if (!currentUser?.org_id) return;
    const clean = drafts
      .map((v, i) => ({ ...v, name: v.name.trim(), sort_order: i }))
      .filter(v => v.name.length > 0);
    try {
      await updateValues.mutateAsync({ org_id: currentUser.org_id, values: clean });
      setDirty(false);
      onToast({ kind: 'success', msg: 'Values saved ✦' });
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Failed to save' });
    }
  };

  const cancel = () => {
    setDirty(false);
    setDrafts(orgValues.map((v, i) => ({
      id: v.id, name: v.name, icon: v.icon, points: v.points, sort_order: v.sort_order ?? i,
    })));
  };

  return (
    <div className="card" style={{ padding: 22 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h3 className="serif" style={{ fontWeight: 600 }}>Company values</h3>
          <div className="muted" style={{ fontSize: 'var(--t-sm)', marginTop: 4 }}>The behaviours your team gets recognised for. Each one carries a point value.</div>
        </div>
        {dirty && (
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={cancel} disabled={updateValues.isPending}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={updateValues.isPending}>
              {updateValues.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Loading…</div>
      ) : isError ? (
        <div className="muted" style={{ padding: 20, textAlign: 'center' }}>
          Couldn&apos;t load values.{' '}
          <button className="btn-text" onClick={() => refetch()}>Retry</button>
        </div>
      ) : (
        <>
          {drafts.length === 0 && (
            <div className="muted" style={{ padding: 20, textAlign: 'center' }}>No values yet. Add one below.</div>
          )}
          {drafts.map((v, i) => (
            <div key={v.id ?? `new-${i}`} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--b-border-soft)', gap: 10 }}>
              <input
                value={v.icon}
                onChange={e => update(i, { icon: e.target.value })}
                maxLength={3}
                style={{ width: 46, padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', textAlign: 'center', fontSize: 18 }}
              />
              <input
                value={v.name}
                onChange={e => update(i, { name: e.target.value })}
                placeholder="Value name"
                style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', fontSize: 'var(--t-sm)' }}
              />
              <input
                type="number"
                value={v.points}
                onChange={e => update(i, { points: Math.max(0, parseInt(e.target.value) || 0) })}
                style={{ width: 80, padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', textAlign: 'right', fontFamily: 'var(--f-mono)' }}
              />
              <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>pts</span>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(i)} title="Remove">
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
          <button className="btn btn-text btn-sm" style={{ marginTop: 14 }} onClick={add}>+ Add value</button>
        </>
      )}
    </div>
  );
}

// ─── RewardsEditor ──────────────────────────────────────
const REWARD_KINDS = ['gift', 'experience', 'donate'] as const;
const REWARD_COLORS = ['#4A90A4', '#E8836A', '#6BA886', '#C68B3B', '#8B5A3C', '#5D7BA0'];

function RewardsEditor({ onToast }: { onToast: (t: Toast) => void }) {
  const { data: rewards = [], isLoading, isError, refetch } = useAllRewards();
  const { data: currentUser } = useCurrentUser();
  const { data: currentOrg } = useCurrentOrg();
  const qc = useQueryClient();
  const updateRewards = useUpdateRewards();
  const [drafts, setDrafts] = useState<(RewardDraft & { _key: string })[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const seedStarter = async () => {
    if (!currentUser?.org_id) return;
    const industry = currentOrg?.industry ?? 'technology';
    setSeeding(true);
    try {
      const preset = starterRewardsForIndustry(industry);
      const { error } = await supabase.from('rewards').insert(preset.map(r => ({
        org_id: currentUser.org_id,
        title: r.title, brand: r.brand, denom: r.denom,
        points: r.points, color: r.color, kind: r.kind, active: true,
      })));
      if (error) throw error;
      qc.invalidateQueries({ queryKey: qk.rewards(currentUser.org_id) });
      qc.invalidateQueries({ queryKey: ['rewards', 'all', currentUser.org_id] });
      qc.invalidateQueries({ queryKey: qk.onboardingStatus(currentUser.org_id) });
      onToast({ kind: 'success', msg: `Added ${preset.length} starter rewards ✦` });
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Could not seed rewards' });
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    if (!dirty) {
      setDrafts(rewards.map(r => ({
        _key: r.id,
        id: r.id, title: r.title, brand: r.brand, denom: r.denom,
        points: r.points, color: r.color, kind: r.kind, active: r.active,
      })));
      setDeletedIds([]);
    }
  }, [rewards, dirty]);

  const update = (i: number, patch: Partial<RewardDraft>) => {
    setDirty(true);
    setDrafts(arr => arr.map((v, idx) => idx === i ? { ...v, ...patch } : v));
  };

  const add = () => {
    setDirty(true);
    setDrafts(arr => [...arr, {
      _key: `new-${Date.now()}-${arr.length}`,
      title: 'New reward', brand: '', denom: '', points: 500,
      color: REWARD_COLORS[arr.length % REWARD_COLORS.length],
      kind: 'gift', active: true,
    }]);
  };

  const remove = (i: number) => {
    setDirty(true);
    const item = drafts[i];
    if (item.id) setDeletedIds(ids => [...ids, item.id!]);
    setDrafts(arr => arr.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    if (!currentUser?.org_id) return;
    const clean = drafts
      .map(({ _key, ...r }) => ({ ...r, title: r.title.trim() }))
      .filter(r => r.title.length > 0);
    try {
      await updateRewards.mutateAsync({
        org_id: currentUser.org_id,
        rewards: clean,
        deletedIds,
      });
      setDirty(false);
      setDeletedIds([]);
      onToast({ kind: 'success', msg: 'Rewards saved' });
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Failed to save' });
    }
  };

  const cancel = () => {
    setDirty(false);
    setDeletedIds([]);
    setDrafts(rewards.map(r => ({
      _key: r.id,
      id: r.id, title: r.title, brand: r.brand, denom: r.denom,
      points: r.points, color: r.color, kind: r.kind, active: r.active,
    })));
  };

  return (
    <div className="card" style={{ padding: 22 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h3 className="serif" style={{ fontWeight: 600 }}>Rewards catalog</h3>
          <div className="muted" style={{ fontSize: 'var(--t-sm)', marginTop: 4 }}>Gift cards, experiences, and donations your team can redeem points for.</div>
        </div>
        {dirty && (
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={cancel} disabled={updateRewards.isPending}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={updateRewards.isPending}>
              {updateRewards.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Loading…</div>
      ) : isError ? (
        <div className="muted" style={{ padding: 20, textAlign: 'center' }}>
          Couldn&apos;t load rewards.{' '}
          <button className="btn-text" onClick={() => refetch()}>Retry</button>
        </div>
      ) : (
        <>
          {drafts.length === 0 && (
            <div style={{ padding: '20px 12px', textAlign: 'center', display: 'grid', gap: 10, justifyItems: 'center' }}>
              <div className="muted">No rewards yet.</div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={seedStarter} disabled={seeding}>
                  {seeding ? 'Seeding…' : 'Seed starter rewards'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={add}>+ Add one manually</button>
              </div>
            </div>
          )}
          {drafts.map((r, i) => (
            <div key={r._key} style={{ padding: '12px 0', borderBottom: '1px solid var(--b-border-soft)', display: 'grid', gridTemplateColumns: '1fr 1fr 90px 110px 90px auto', gap: 8, alignItems: 'center' }}>
              <input
                value={r.title}
                onChange={e => update(i, { title: e.target.value })}
                placeholder="Title"
                style={{ padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', fontSize: 'var(--t-sm)' }}
              />
              <input
                value={r.brand}
                onChange={e => update(i, { brand: e.target.value })}
                placeholder="Brand / description"
                style={{ padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', fontSize: 'var(--t-sm)' }}
              />
              <input
                value={r.denom}
                onChange={e => update(i, { denom: e.target.value })}
                placeholder="$25"
                style={{ padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', fontSize: 'var(--t-sm)' }}
              />
              <select
                value={r.kind}
                onChange={e => update(i, { kind: e.target.value })}
                style={{ padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', fontSize: 'var(--t-sm)' }}
              >
                {REWARD_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <input
                type="number"
                value={r.points}
                onChange={e => update(i, { points: Math.max(0, parseInt(e.target.value) || 0) })}
                style={{ padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', textAlign: 'right', fontFamily: 'var(--f-mono)' }}
              />
              <div className="row" style={{ gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => update(i, { active: !r.active })}
                  title={r.active ? 'Active' : 'Inactive'}
                  style={{ opacity: r.active ? 1 : 0.5 }}
                >
                  {r.active ? 'On' : 'Off'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => remove(i)} title="Remove">
                  <Icon name="close" size={12} />
                </button>
              </div>
            </div>
          ))}
          <button className="btn btn-text btn-sm" style={{ marginTop: 14 }} onClick={add}>+ Add reward</button>
        </>
      )}
    </div>
  );
}

// ─── BadgesEditor ───────────────────────────────────────
function BadgesEditor({ onToast }: { onToast: (t: Toast) => void }) {
  const { data: badges = [], isLoading, isError, refetch } = useAllBadges();
  const { data: currentUser } = useCurrentUser();
  const updateBadges = useUpdateBadges();
  const [drafts, setDrafts] = useState<(BadgeDraft & { _key: string })[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) {
      setDrafts(badges.map(b => ({
        _key: b.id,
        id: b.id, name: b.name, icon: b.icon, category: b.category,
        criteria: b.criteria, is_seasonal: b.is_seasonal,
      })));
      setDeletedIds([]);
    }
  }, [badges, dirty]);

  const update = (i: number, patch: Partial<BadgeDraft>) => {
    setDirty(true);
    setDrafts(arr => arr.map((v, idx) => idx === i ? { ...v, ...patch } : v));
  };

  const add = () => {
    setDirty(true);
    setDrafts(arr => [...arr, {
      _key: `new-${Date.now()}-${arr.length}`,
      name: 'New badge', icon: '✦', category: 'Milestones',
      criteria: '', is_seasonal: false,
    }]);
  };

  const remove = (i: number) => {
    setDirty(true);
    const item = drafts[i];
    if (item.id) setDeletedIds(ids => [...ids, item.id!]);
    setDrafts(arr => arr.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    if (!currentUser?.org_id) return;
    const clean = drafts
      .map(({ _key, ...b }) => ({ ...b, name: b.name.trim() }))
      .filter(b => b.name.length > 0);
    try {
      await updateBadges.mutateAsync({
        org_id: currentUser.org_id,
        badges: clean,
        deletedIds,
      });
      setDirty(false);
      setDeletedIds([]);
      onToast({ kind: 'success', msg: 'Badges saved' });
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Failed to save' });
    }
  };

  const cancel = () => {
    setDirty(false);
    setDeletedIds([]);
    setDrafts(badges.map(b => ({
      _key: b.id,
      id: b.id, name: b.name, icon: b.icon, category: b.category,
      criteria: b.criteria, is_seasonal: b.is_seasonal,
    })));
  };

  return (
    <div className="card" style={{ padding: 22 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h3 className="serif" style={{ fontWeight: 600 }}>Badges</h3>
          <div className="muted" style={{ fontSize: 'var(--t-sm)', marginTop: 4 }}>Milestones and recognitions your team can earn and nominate each other for.</div>
        </div>
        {dirty && (
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={cancel} disabled={updateBadges.isPending}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={updateBadges.isPending}>
              {updateBadges.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Loading…</div>
      ) : isError ? (
        <div className="muted" style={{ padding: 20, textAlign: 'center' }}>
          Couldn&apos;t load badges.{' '}
          <button className="btn-text" onClick={() => refetch()}>Retry</button>
        </div>
      ) : (
        <>
          {drafts.length === 0 && (
            <div className="muted" style={{ padding: 20, textAlign: 'center' }}>No badges yet. Add one below.</div>
          )}
          {drafts.map((b, i) => (
            <div key={b._key} style={{ padding: '12px 0', borderBottom: '1px solid var(--b-border-soft)', display: 'grid', gridTemplateColumns: '46px 1fr 140px 1fr auto auto', gap: 8, alignItems: 'center' }}>
              <input
                value={b.icon}
                onChange={e => update(i, { icon: e.target.value })}
                maxLength={3}
                style={{ padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', textAlign: 'center', fontSize: 18 }}
              />
              <input
                value={b.name}
                onChange={e => update(i, { name: e.target.value })}
                placeholder="Badge name"
                style={{ padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', fontSize: 'var(--t-sm)' }}
              />
              <input
                value={b.category}
                onChange={e => update(i, { category: e.target.value })}
                placeholder="Category"
                style={{ padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', fontSize: 'var(--t-sm)' }}
              />
              <input
                value={b.criteria}
                onChange={e => update(i, { criteria: e.target.value })}
                placeholder="Criteria"
                style={{ padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', fontSize: 'var(--t-sm)' }}
              />
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => update(i, { is_seasonal: !b.is_seasonal })}
                title={b.is_seasonal ? 'Seasonal' : 'Permanent'}
                style={{ opacity: b.is_seasonal ? 1 : 0.5 }}
              >
                {b.is_seasonal ? 'Seasonal' : 'Standard'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(i)} title="Remove">
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
          <button className="btn btn-text btn-sm" style={{ marginTop: 14 }} onClick={add}>+ Add badge</button>
        </>
      )}
    </div>
  );
}

// ─── Team & roles (admin-only) ──────────────────────────
function TeamPanel({ onToast }: { onToast: (t: Toast) => void }) {
  const { data: currentUser } = useCurrentUser();
  const { data: users = [], isLoading, isError, refetch } = useOrgUsers();
  const { data: pending = [], isLoading: pendingLoading, refetch: refetchPending } = usePendingInvites(currentUser?.role === 'admin');
  const qc = useQueryClient();
  const updateRole = useUpdateUserRole();
  const invite = useInviteTeammate();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'employee' | 'manager'>('employee');
  const [resendingId, setResendingId] = useState<string | null>(null);

  const changeRole = async (userId: string, role: 'employee' | 'manager' | 'admin') => {
    if (!currentUser?.org_id) return;
    try {
      await updateRole.mutateAsync({ user_id: userId, org_id: currentUser.org_id, role });
      onToast({ kind: 'success', msg: 'Role updated ✦' });
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Could not update role' });
    }
  };

  const sendInvite = async () => {
    if (!currentUser?.org_id || !inviteEmail.trim()) return;
    try {
      await invite.mutateAsync({ email: inviteEmail.trim(), org_id: currentUser.org_id, role: inviteRole });
      onToast({ kind: 'success', msg: `Invited ${inviteEmail.trim()} ✦` });
      setInviteEmail('');
      qc.invalidateQueries({ queryKey: ['pendingInvites'] });
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Invite failed' });
    }
  };

  const resendInvite = async (email: string, role: string | null, id: string) => {
    if (!currentUser?.org_id) return;
    const sendRole: 'employee' | 'manager' = role === 'manager' ? 'manager' : 'employee';
    setResendingId(id);
    try {
      await invite.mutateAsync({ email, org_id: currentUser.org_id, role: sendRole });
      onToast({ kind: 'success', msg: `Re-sent invite to ${email}` });
      qc.invalidateQueries({ queryKey: ['pendingInvites'] });
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Resend failed' });
    } finally {
      setResendingId(null);
    }
  };

  const daysSince = (iso: string | null) => {
    if (!iso) return null;
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    return days;
  };

  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 className="serif" style={{ fontWeight: 600 }}>Team & roles</h3>
      <div className="muted" style={{ fontSize: 'var(--t-sm)', marginTop: 4, marginBottom: 16 }}>
        Invite teammates, promote managers, or re-send invites to anyone who hasn&apos;t joined yet.
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <input
          type="email"
          placeholder="teammate@company.ca"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          aria-label="Teammate email"
          style={{ flex: 1, minWidth: 220, padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)' }}
        />
        <select
          value={inviteRole}
          onChange={e => setInviteRole(e.target.value as 'employee' | 'manager')}
          aria-label="Role for new invite"
          style={{ padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)' }}
        >
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
        </select>
        <button
          className="btn btn-primary btn-sm"
          onClick={sendInvite}
          disabled={!inviteEmail.trim() || invite.isPending}
        >
          {invite.isPending ? 'Sending…' : 'Send invite'}
        </button>
      </div>

      {isLoading ? (
        <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Loading…</div>
      ) : isError ? (
        <div className="muted" style={{ padding: 20, textAlign: 'center' }}>
          Couldn&apos;t load teammates.{' '}
          <button className="btn-text" onClick={() => refetch()}>Retry</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {users.map(u => {
            const isSelf = u.id === currentUser?.id;
            return (
              <div key={u.id} className="row" style={{ gap: 10, padding: '10px 0', borderBottom: '1px solid var(--b-border-soft)' }}>
                <div style={{ flex: 1 }}>
                  <div className="serif" style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{u.display_name}</div>
                  <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>{u.title || u.role}</div>
                </div>
                <select
                  value={u.role}
                  onChange={e => changeRole(u.id, e.target.value as 'employee' | 'manager' | 'admin')}
                  disabled={isSelf || updateRole.isPending}
                  aria-label={`Role for ${u.display_name}`}
                  style={{ padding: '6px 8px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', fontSize: 'var(--t-xs)' }}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="label">Pending invites</div>
          <button className="btn-text" style={{ fontSize: 'var(--t-xs)' }} onClick={() => refetchPending()} aria-label="Refresh pending invites">Refresh</button>
        </div>
        {pendingLoading ? (
          <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>Loading…</div>
        ) : pending.length === 0 ? (
          <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>Everyone you invited has joined ✦</div>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {pending.map(p => {
              const days = daysSince(p.invited_at);
              const stale = days !== null && days >= 3;
              return (
                <div key={p.id} className="row" style={{ gap: 10, padding: '8px 0', borderBottom: '1px solid var(--b-border-soft)' }}>
                  <div style={{ flex: 1, fontSize: 'var(--t-sm)' }}>
                    <div style={{ fontWeight: 500 }}>{p.email}</div>
                    <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>
                      {p.role ? `${p.role} · ` : ''}
                      {days === null ? 'invited' : days === 0 ? 'invited today' : `invited ${days}d ago`}
                      {stale && ' · haven’t joined yet'}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => resendInvite(p.email, p.role, p.id)}
                    disabled={resendingId === p.id || invite.isPending}
                  >
                    {resendingId === p.id ? '…' : 'Resend'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CSV Export helper ──────────────────────────────────
function toCsvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ─── AdminPage ──────────────────────────────────────────
export function AdminPage({ onToast, onOpenKudos }: { onToast: (t: Toast) => void; onOpenKudos: () => void }) {
  const { data: recs = [] } = useRecognitions();
  const { data: currentUser } = useCurrentUser();
  const { data: currentOrg } = useCurrentOrg();
  const { data: onboardingStatus } = useOnboardingStatus();
  const needsSetup = !!currentOrg && !currentOrg.onboarded_at;
  type AdminTab = 'setup' | 'integrations' | 'billing' | 'approvals' | 'values' | 'rewards' | 'badges' | 'team' | 'budget' | 'export';
  const VALID_TABS: AdminTab[] = ['setup', 'integrations', 'billing', 'approvals', 'values', 'rewards', 'badges', 'team', 'budget', 'export'];
  const [tab, setTab] = useState<AdminTab>(() => {
    const pending = typeof window !== 'undefined' ? sessionStorage.getItem('bryte:adminTab') : null;
    if (pending) {
      sessionStorage.removeItem('bryte:adminTab');
      if ((VALID_TABS as string[]).includes(pending)) return pending as AdminTab;
    }
    return needsSetup && currentUser?.role === 'admin' ? 'setup' : 'integrations';
  });
  const [exporting, setExporting] = useState(false);

  const exportRecognitionsCsv = async () => {
    if (!recs.length) {
      onToast({ kind: 'info', msg: 'Nothing to export yet.' });
      return;
    }
    const header = ['Date', 'Sender', 'Recipient', 'Value', 'Points', 'Type'];
    const rows = recs.map(r => [
      new Date(r.created_at).toISOString(),
      (r.sender as any)?.display_name ?? '',
      (r.recipient as any)?.display_name ?? '',
      (r.value as any)?.name ?? '',
      r.points,
      r.type,
    ]);
    const csv = [header, ...rows].map(row => row.map(toCsvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recognitions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast({ kind: 'success', msg: `Exported ${rows.length} recognitions ✦` });
  };

  const exportTeamCsv = async () => {
    if (!currentUser?.org_id) return;
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('display_name, title, role, points, start_date')
        .eq('org_id', currentUser.org_id)
        .order('points', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []).map(u => [u.display_name, u.title, u.role, u.points, u.start_date ?? '']);
      const csv = [['Name', 'Title', 'Role', 'Points', 'Start date'], ...rows].map(r => r.map(toCsvCell).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `team-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onToast({ kind: 'success', msg: 'Team roster downloaded ✦' });
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Export failed' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin</h1>
          <div className="sub">Configure values, budgets, integrations. Export anything you need.</div>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {(['setup', 'integrations', 'billing', 'approvals', 'values', 'rewards', 'badges', 'team', 'budget', 'export'] as const)
          .filter(t => {
            if (t === 'setup') return currentUser?.role === 'admin';
            if (t === 'rewards' || t === 'badges' || t === 'team') return currentUser?.role === 'admin';
            return true;
          })
          .map(t => (
          <button key={t} className={'chip' + (tab === t ? ' chip-active' : '')} onClick={() => setTab(t)}>
            {t === 'setup'
              ? (needsSetup ? 'Setup •' : 'Setup')
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'setup' && currentUser?.role === 'admin' && (
        <SetupPanel
          onToast={onToast}
          onJumpTab={(t) => setTab(t as typeof tab)}
          status={onboardingStatus}
        />
      )}

      {tab === 'integrations' && <IntegrationsPanel />}
      {tab === 'billing' && <BillingPanel />}
      {tab === 'approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          <ApprovalQueuePanel onToast={onToast} />
          <NominationApprovalsPanel onToast={onToast} />
        </div>
      )}

      {tab === 'values' && <ValuesEditor onToast={onToast} />}

      {tab === 'rewards' && currentUser?.role === 'admin' && <RewardsEditor onToast={onToast} />}
      {tab === 'badges' && currentUser?.role === 'admin' && <BadgesEditor onToast={onToast} />}
      {tab === 'team' && currentUser?.role === 'admin' && <TeamPanel onToast={onToast} />}

      {tab === 'budget' && <BudgetPanel />}

      {tab === 'export' && (
        <div className="card" style={{ padding: 22 }}>
          <h3 className="serif" style={{ fontWeight: 600, marginBottom: 12 }}>Export & print</h3>
          <div className="muted" style={{ fontSize: 'var(--t-sm)', marginBottom: 18 }}>Take recognition out of the app — onto walls, into reports, into archives.</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <button className="btn btn-ghost" onClick={onOpenKudos}>
              <Icon name="pen" size={14} /> Print kudos cards
            </button>
            <button className="btn btn-ghost" onClick={exportRecognitionsCsv}>
              <Icon name="arrow" size={14} /> Export recognitions (CSV)
            </button>
            <button className="btn btn-ghost" onClick={exportTeamCsv} disabled={exporting}>
              <Icon name="arrow" size={14} /> {exporting ? 'Exporting…' : 'Export team roster (CSV)'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── SetupPanel ─────────────────────────────────────────
interface SetupPanelProps {
  onToast: (t: Toast) => void;
  onJumpTab: (t: OCTabTarget) => void;
  status: ReturnType<typeof useOnboardingStatus>['data'];
}

function SetupPanel({ onToast, onJumpTab, status }: SetupPanelProps) {
  const { data: org } = useCurrentOrg();
  const updateOrg = useUpdateOrg();
  const [name, setName] = useState(org?.name ?? '');
  const [industry, setIndustry] = useState(org?.industry ?? 'technology');

  useEffect(() => {
    if (org) {
      setName(org.name ?? '');
      setIndustry(org.industry ?? 'technology');
    }
  }, [org?.id]);

  if (!org || !status) {
    return <div className="card" style={{ padding: 22 }}>Loading setup&hellip;</div>;
  }

  const saveProfile = async () => {
    try {
      await updateOrg.mutateAsync({ org_id: org.id, name, industry });
      onToast({ kind: 'success', msg: 'Organisation profile saved ✦' });
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Could not save' });
    }
  };

  const profileDirty = (name.trim() !== (org.name ?? '').trim()) || (industry !== (org.industry ?? ''));

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {!status.onboardedAt ? (
        <div className="card" style={{ padding: '14px 18px', borderLeft: '3px solid var(--b-gold)', background: 'var(--b-gold-pale)' }}>
          <div style={{ fontSize: 'var(--t-sm)', color: 'var(--b-ink-2)', lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--b-ink)' }}>Your workspace isn&rsquo;t live yet.</strong>{' '}
            Work through the checklist below. Your teammates will be locked out until you mark setup complete.
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '14px 18px', borderLeft: '3px solid var(--b-forest)', background: 'var(--b-forest-pale)' }}>
          <div style={{ fontSize: 'var(--t-sm)', color: 'var(--b-ink-2)' }}>
            Setup complete. You can still edit any section below.
          </div>
        </div>
      )}

      {/* Org profile */}
      <div className="card" style={{ padding: 22 }}>
        <h3 className="serif" style={{ fontWeight: 600, marginBottom: 6 }}>Organisation profile</h3>
        <p className="muted" style={{ fontSize: 'var(--t-sm)', marginBottom: 16 }}>
          Your org name and industry shape the defaults your team sees.
        </p>
        <div style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
          <div>
            <label className="form-label" htmlFor="setup-org-name">Organisation name</label>
            <input id="setup-org-name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mapleview Medical" />
          </div>
          <div>
            <label className="form-label" htmlFor="setup-industry">Industry</label>
            <select id="setup-industry" className="input" value={industry} onChange={e => setIndustry(e.target.value)}>
              {Object.entries(BRYTE_DATA.INDUSTRIES).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={updateOrg.isPending || !profileDirty || !name.trim()}>
              {updateOrg.isPending ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="card" style={{ padding: 22 }}>
        <OnboardingChecklist
          onToast={onToast}
          onJumpTab={onJumpTab}
          variant="full"
          heading="Setup checklist"
          description="Each item must be complete before your workspace goes live."
        />
      </div>
    </div>
  );
}
