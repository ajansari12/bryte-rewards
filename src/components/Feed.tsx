import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from './Icon';
import { supabase } from '@/lib/supabase';
import { useRecognitions } from '@/lib/queries/recognitions';
import { useFeedStats } from '@/lib/queries/analytics';
import type { DbRecognition } from '@/lib/queries/recognitions';
import { useCurrentUser, useCurrentOrg } from '@/lib/queries/users';
import { useAddReaction } from '@/lib/mutations/useAddReaction';
import { qk } from '@/lib/queries/keys';
import type { Recognition } from '@/lib/types';
import { NominationsBanner, AnniversaryStrip } from './Additions';

// Industry-specific empty state copy (presentational config, not DB data)
const EMPTY_STATES: Record<string, string> = {
  healthcare: "The ward's quiet. Who on your team deserves a shoutout today?",
  construction: "No site wins shared yet. Who kept the crew safe this week?",
  retail: "No floor moments yet. Which teammate went above and beyond today?",
  technology: "No shipped kudos yet. Who unblocked someone this week?",
  hospitality: "The feed is empty. Who made a guest's night last shift?",
  financial: "No recognitions yet. Who went the extra mile for a client this week?",
};

// ---------------------------------------------------------------------------
// Adapter: DbRecognition → legacy Recognition shape used by RecCard
// ---------------------------------------------------------------------------
function toRec(r: DbRecognition): Recognition {
  const sender = (r.sender as any)?.display_name ?? 'Unknown';
  const senderRole = (r.sender as any)?.role ?? 'employee';
  const recipient = (r.recipient as any)?.display_name ?? 'Unknown';
  const value = (r.value as any)?.name ?? '';

  // Convert reactions array → Record<emoji, count>
  const reactions: Record<string, number> = {};
  for (const rx of r.reactions ?? []) {
    reactions[rx.emoji] = (reactions[rx.emoji] ?? 0) + 1;
  }

  return {
    _id: r.id,
    sender,
    senderRole,
    recipient,
    value,
    message: r.message,
    points: r.points,
    time: formatRelTime(r.created_at),
    type: r.type,
    reactions,
  };
}

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// useCountUp hook
// ---------------------------------------------------------------------------
const useCountUp = (target: number, duration = 1200): number => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
};

// ---------------------------------------------------------------------------
// ReactionPicker
// ---------------------------------------------------------------------------
interface ReactionPickerProps {
  onPick: (emoji: string) => void;
  myReacts: Record<string, number>;
  recReacts: Record<string, number>;
}

export function ReactionPicker({ onPick, myReacts, recReacts }: ReactionPickerProps) {
  const [open, setOpen] = useState(false);
  const allEmoji = ['👏', '❤️', '🔥', '⭐', '🎉'];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="reaction" onClick={() => setOpen((s) => !s)} title="React">
        <Icon name="plus" size={12} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '110%', right: 0,
          background: 'var(--b-card)', border: '1px solid var(--b-border)',
          borderRadius: 'var(--r-lg)', padding: '8px 10px',
          boxShadow: 'var(--shadow-md)', display: 'flex', gap: 4,
          zIndex: 20, animation: 'page-in 120ms var(--ease)',
        }}>
          {allEmoji.map((e) => {
            const mine = !!myReacts[e];
            return (
              <button key={e} onClick={() => { onPick(e); setOpen(false); }}
                style={{
                  width: 34, height: 34, borderRadius: 8, fontSize: 18,
                  background: mine ? 'var(--b-gold-pale)' : 'transparent',
                  border: mine ? '1px solid var(--b-gold-border)' : '1px solid transparent',
                  transition: 'all 120ms var(--ease)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={(e2) => { e2.currentTarget.style.background = 'var(--b-elevated)'; e2.currentTarget.style.transform = 'scale(1.2)'; }}
                onMouseLeave={(e2) => { e2.currentTarget.style.background = mine ? 'var(--b-gold-pale)' : 'transparent'; e2.currentTarget.style.transform = 'scale(1)'; }}
              >
                {e}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecCard
// ---------------------------------------------------------------------------
interface RecCardProps {
  rec: Recognition;
  isNew: boolean;
  onReact?: (rec: Recognition, emoji: string) => void;
  reactions?: Record<string, number>;
}

export function RecCard({ rec, isNew, onReact, reactions }: RecCardProps) {
  const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  const typeClass = rec.type === 'milestone' ? 'type-milestone' : rec.type === 'spotlight' ? 'type-spotlight' : '';
  const myReacts = reactions || {};

  return (
    <article className={`rec-card ${typeClass} ${isNew ? 'new-card' : ''}`}>
      <div className="strip" />
      <div className="rec-body">
        <div className="rec-header">
          <div className={`avatar md role-${rec.senderRole || 'employee'} avatar-hover`}>
            {initials(rec.sender)}
          </div>
          <div className="rec-names">
            <span className="rec-sender">{rec.sender}</span>{' '}
            <span className="rec-verb">recognised</span>{' '}
            <span className="rec-recipient">{rec.recipient}</span>
          </div>
          <span className="rec-time">{rec.time}</span>
        </div>
        <p className="rec-message">&ldquo;{rec.message}&rdquo;</p>
        <div className="rec-footer">
          <div className="rec-footer-left">
            <span className="value-seal"><span className="star">★</span> {rec.value}</span>
            <span className="dot" />
            <span className="points-badge">+{rec.points} pts</span>
          </div>
          <div className="reactions">
            {Object.entries({ ...(rec.reactions || {}), ...myReacts }).map(([emoji, count]) => {
              const mine = !!myReacts[emoji];
              const total = (rec.reactions?.[emoji] || 0) + (mine ? 1 : 0);
              if (total === 0) return null;
              return (
                <button key={emoji} className={`reaction ${mine ? 'active' : ''}`}
                  onClick={() => onReact?.(rec, emoji)}>
                  <span>{emoji}</span>
                  <span className="count" style={{ animation: mine ? 'count-pop 200ms var(--ease-spring)' : 'none' }}>
                    {total}
                  </span>
                </button>
              );
            })}
            <ReactionPicker
              onPick={(emoji) => onReact?.(rec, emoji)}
              myReacts={myReacts}
              recReacts={rec.reactions || {}}
            />
          </div>
        </div>
      </div>
      <style>{`@keyframes count-pop { 0%{transform:scale(1)} 50%{transform:scale(1.5)} 100%{transform:scale(1)} }`}</style>
    </article>
  );
}

// ---------------------------------------------------------------------------
// StatCardAnimated
// ---------------------------------------------------------------------------
interface StatCardAnimatedProps {
  label: string;
  rawValue: string | number;
  trend: string;
  dir: string;
}

export function StatCardAnimated({ label, rawValue, trend, dir }: StatCardAnimatedProps) {
  const numericPart = String(rawValue).replace(/[^0-9.]/g, '');
  const suffix = String(rawValue).replace(/[0-9.,]/g, '');
  const animated = useCountUp(parseFloat(numericPart) || 0, 1400);
  const display = animated >= 1000 ? (animated / 1000).toFixed(1) + 'k' : animated;
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="stat-number">{suffix ? `${display}${suffix}` : display}</span>
        <span className={`stat-trend ${dir}`}><Icon name={dir} size={11} stroke={2.5} /> {trend}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FeedPage
// ---------------------------------------------------------------------------
interface FeedPageProps {
  onRecognize?: () => void;
  onOpenRec?: (rec: Recognition) => void;
  onCelebrate?: (anniversary: any) => void;
  onVote?: (name: string) => void;
}

export function FeedPage({ onRecognize, onOpenRec, onCelebrate, onVote }: FeedPageProps) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: org } = useCurrentOrg();
  const { data: dbRecs, isLoading } = useRecognitions();
  const { data: feedStats } = useFeedStats();
  const addReaction = useAddReaction();

  const today = new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
  const [filter, setFilter] = useState('All');

  // Real-time subscription — invalidate on new recognition inserts in this org
  useEffect(() => {
    if (!currentUser?.org_id) return;
    const channel = supabase
      .channel(`recognitions:${currentUser.org_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'recognitions', filter: `org_id=eq.${currentUser.org_id}` },
        () => { queryClient.invalidateQueries({ queryKey: qk.recognitions(currentUser.org_id) }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.org_id, queryClient]);

  const recs = (dbRecs ?? []).map(toRec);

  const handleReact = (rec: Recognition, emoji: string) => {
    if (!currentUser?.id || !currentUser?.org_id) return;
    const dbRec = dbRecs?.find(r => r.id === rec._id);
    if (!dbRec) return;
    const alreadyReacted = dbRec.reactions.some(
      r => r.user_id === currentUser.id && r.emoji === emoji
    );
    addReaction.mutate({
      recognition_id: rec._id!,
      user_id: currentUser.id,
      emoji,
      org_id: currentUser.org_id,
      toggle: !alreadyReacted,
    });
  };

  const getMyReacts = (rec: Recognition): Record<string, number> => {
    if (!currentUser?.id) return {};
    const dbRec = dbRecs?.find(r => r.id === rec._id);
    if (!dbRec) return {};
    const result: Record<string, number> = {};
    for (const r of dbRec.reactions) {
      if (r.user_id === currentUser.id) result[r.emoji] = 1;
    }
    return result;
  };

  const valueNames = [...new Set(recs.map(r => r.value).filter(Boolean))];
  const filterOpts = ['All', 'Milestone', 'Spotlight', ...valueNames];

  const filtered = recs.filter(r => {
    if (filter === 'All') return true;
    if (filter === 'Milestone') return r.type === 'milestone';
    if (filter === 'Spotlight') return r.type === 'spotlight';
    return r.value === filter;
  });

  const totalPoints = recs.reduce((s, r) => s + r.points, 0);
  const fmtTrend = (n: number) => (n > 0 ? `+${n}%` : n < 0 ? `${n}%` : '—');
  const stats = feedStats
    ? [
        {
          label: 'Recognitions this month',
          rawValue: feedStats.recognitionsThisMonth,
          trend: fmtTrend(feedStats.recognitionsTrendPct),
          dir: feedStats.recognitionsTrendPct >= 0 ? 'up' : 'down',
        },
        {
          label: 'Team participation',
          rawValue: `${feedStats.participationPct}%`,
          trend: fmtTrend(feedStats.participationTrendPct),
          dir: feedStats.participationTrendPct >= 0 ? 'up' : 'down',
        },
        {
          label: 'Points given',
          rawValue: feedStats.pointsGivenThisMonth,
          trend: fmtTrend(feedStats.pointsTrendPct),
          dir: feedStats.pointsTrendPct >= 0 ? 'up' : 'down',
        },
      ]
    : [
        { label: 'Recognitions this month', rawValue: recs.length, trend: '—', dir: 'up' },
        { label: 'Points given', rawValue: totalPoints, trend: '—', dir: 'up' },
      ];

  const industry = org?.industry ?? 'healthcare';
  const emptyState = EMPTY_STATES[industry] ?? 'Be the first to recognise someone on your team.';

  if (isLoading) {
    return (
      <div>
        <div className="page-head">
          <div><h1 className="page-title">Recognition feed</h1><div className="sub">{today}</div></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="rec-card" style={{ opacity: 0.4, pointerEvents: 'none' }}>
              <div className="strip" />
              <div className="rec-body">
                <div style={{ height: 16, width: '60%', background: 'var(--b-border)', borderRadius: 4, marginBottom: 10 }} />
                <div style={{ height: 12, width: '90%', background: 'var(--b-border)', borderRadius: 4, marginBottom: 6 }} />
                <div style={{ height: 12, width: '70%', background: 'var(--b-border)', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recs.length === 0) {
    return (
      <div>
        <div className="page-head">
          <div><h1 className="page-title">Recognition feed</h1><div className="sub">{today}</div></div>
        </div>
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <svg width="88" height="88" viewBox="0 0 88 88" style={{ marginBottom: 20 }}>
            <g transform="translate(44 44)">
              {[0,1,2,3,4,5,6,7].map(i => (
                <rect key={i} x="-1.5" y="-30" width="3" height="14" rx="1.5" fill="var(--b-gold)"
                  transform={`rotate(${i * 45})`} opacity={0.5 + (i % 3) * 0.15} />
              ))}
              <circle r="10" fill="var(--b-gold-pale)" stroke="var(--b-gold)" strokeWidth="2" />
              <text textAnchor="middle" dy="4" fontSize="14" fontFamily="Fraunces" fill="var(--b-gold)" fontWeight="700">✦</text>
            </g>
          </svg>
          <h2 className="section-heading" style={{ marginBottom: 8 }}>The wall is ready.</h2>
          <p className="body muted" style={{ maxWidth: 380, margin: '0 auto 24px' }}>{emptyState}</p>
          <button className="btn btn-celebrate" onClick={onRecognize}><span>✦</span> Recognise a teammate</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div><h1 className="page-title">Recognition feed</h1><div className="sub">{today}</div></div>
      </div>

      <NominationsBanner onVote={onVote} />
      <AnniversaryStrip onCelebrate={onCelebrate} />

      <div className="stat-strip" style={{ marginBottom: 22 }}>
        {stats.map((s, i) => <StatCardAnimated key={i} {...s} />)}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22, overflowX: 'auto', paddingBottom: 4 }}>
        {filterOpts.map(f => (
          <button key={f} className={'btn btn-sm ' + (filter === f ? 'btn-primary' : 'btn-ghost')}
            onClick={() => setFilter(f)} style={{ whiteSpace: 'nowrap' }}>
            {f === 'Milestone' ? '🏆 ' : f === 'Spotlight' ? '⭐ ' : ''}{f}
          </button>
        ))}
        {filter !== 'All' && (
          <button className="btn btn-sm btn-text" onClick={() => setFilter('All')} style={{ padding: '6px 10px' }}>
            <Icon name="close" size={11} /> Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="muted" style={{ marginBottom: 12 }}>No recognitions match this filter.</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setFilter('All')}>Show all</button>
        </div>
      ) : (
        <div className="wall">
          {filtered.map(r => (
            <div key={r._id} onClick={() => onOpenRec?.(r)} style={{ cursor: 'pointer' }}>
              <RecCard
                rec={r}
                isNew={false}
                onReact={(rec, e) => handleReact(rec, e)}
                reactions={getMyReacts(r)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
