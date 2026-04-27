import { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { BRYTE_DATA } from '@/lib/data';
import type { Recognition } from '@/lib/types';
import { NominationsBanner, AnniversaryStrip } from './Additions';

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
        <div
          style={{
            position: 'absolute',
            bottom: '110%',
            right: 0,
            background: 'var(--b-card)',
            border: '1px solid var(--b-border)',
            borderRadius: 'var(--r-lg)',
            padding: '8px 10px',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            gap: 4,
            zIndex: 20,
            animation: 'page-in 120ms var(--ease)',
          }}
        >
          {allEmoji.map((e) => {
            const mine = !!myReacts[e];
            return (
              <button
                key={e}
                onClick={() => {
                  onPick(e);
                  setOpen(false);
                }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  fontSize: 18,
                  background: mine ? 'var(--b-gold-pale)' : 'transparent',
                  border: mine
                    ? '1px solid var(--b-gold-border)'
                    : '1px solid transparent',
                  transition: 'all 120ms var(--ease)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e2) => {
                  e2.currentTarget.style.background = 'var(--b-elevated)';
                  e2.currentTarget.style.transform = 'scale(1.2)';
                }}
                onMouseLeave={(e2) => {
                  e2.currentTarget.style.background = mine
                    ? 'var(--b-gold-pale)'
                    : 'transparent';
                  e2.currentTarget.style.transform = 'scale(1)';
                }}
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
  const initials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('');
  const typeClass =
    rec.type === 'milestone'
      ? 'type-milestone'
      : rec.type === 'spotlight'
      ? 'type-spotlight'
      : '';
  const myReacts = reactions || {};

  return (
    <article className={`rec-card ${typeClass} ${isNew ? 'new-card' : ''}`}>
      <div className="strip" />
      <div className="rec-body">
        <div className="rec-header">
          <div
            className={`avatar md role-${rec.senderRole || 'employee'} avatar-hover`}
          >
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
            <span className="value-seal">
              <span className="star">★</span> {rec.value}
            </span>
            <span className="dot" />
            <span className="points-badge">+{rec.points} pts</span>
          </div>
          <div className="reactions">
            {Object.entries({ ...(rec.reactions || {}), ...myReacts }).map(
              ([emoji, count]) => {
                const mine = !!myReacts[emoji];
                const total = (rec.reactions?.[emoji] || 0) + (mine ? 1 : 0);
                if (total === 0) return null;
                return (
                  <button
                    key={emoji}
                    className={`reaction ${mine ? 'active' : ''}`}
                    onClick={() => onReact?.(rec, emoji)}
                  >
                    <span>{emoji}</span>
                    <span
                      className="count"
                      style={{
                        animation: mine
                          ? 'count-pop 200ms var(--ease-spring)'
                          : 'none',
                      }}
                    >
                      {total}
                    </span>
                  </button>
                );
              }
            )}
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

export function StatCardAnimated({
  label,
  rawValue,
  trend,
  dir,
}: StatCardAnimatedProps) {
  const numericPart = String(rawValue).replace(/[^0-9.]/g, '');
  const suffix = String(rawValue).replace(/[0-9.,]/g, '');
  const animated = useCountUp(parseFloat(numericPart) || 0, 1400);
  const display =
    animated >= 1000 ? (animated / 1000).toFixed(1) + 'k' : animated;
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div
        className="row"
        style={{ alignItems: 'baseline', justifyContent: 'space-between' }}
      >
        <span className="stat-number">
          {suffix ? `${display}${suffix}` : display}
        </span>
        <span className={`stat-trend ${dir}`}>
          <Icon name={dir} size={11} stroke={2.5} /> {trend}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FeedPage
// ---------------------------------------------------------------------------

interface FeedPageProps {
  industry: string;
  recs: Recognition[];
  newIds: Set<string>;
  onRecognize?: () => void;
  onOpenRec?: (rec: Recognition) => void;
  onCelebrate?: (anniversary: any) => void;
  onVote?: (name: string) => void;
}

export function FeedPage({
  industry,
  recs,
  newIds,
  onRecognize,
  onOpenRec,
  onCelebrate,
  onVote,
}: FeedPageProps) {
  const pack = BRYTE_DATA.INDUSTRIES[industry];
  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const [filter, setFilter] = useState('All');
  const [myReactions, setMyReactions] = useState<Record<string, boolean>>({});

  const handleReact = (rec: Recognition, emoji: string) => {
    setMyReactions((prev) => {
      const key = `${rec._id}-${emoji}`;
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  const getMyReacts = (rec: Recognition): Record<string, number> => {
    const result: Record<string, number> = {};
    ['👏', '❤️', '🔥', '⭐', '🎉'].forEach((e) => {
      if (myReactions[`${rec._id}-${e}`]) result[e] = 1;
    });
    return result;
  };

  const valueNames = [...new Set(recs.map((r) => r.value))];
  const filterOpts = ['All', 'Milestone', 'Spotlight', ...valueNames];

  const filtered = recs.filter((r) => {
    if (filter === 'All') return true;
    if (filter === 'Milestone') return r.type === 'milestone';
    if (filter === 'Spotlight') return r.type === 'spotlight';
    return r.value === filter;
  });

  const stats = [
    {
      label: 'Recognitions this month',
      rawValue: recs.length + 42,
      trend: '+18%',
      dir: 'up',
    },
    { label: 'Team participation', rawValue: '92%', trend: '+4%', dir: 'up' },
    { label: 'Points given', rawValue: 14320, trend: '+22%', dir: 'up' },
  ];

  if (recs.length === 0) {
    return (
      <div>
        <div className="page-head">
          <div>
            <h1 className="page-title">Recognition feed</h1>
            <div className="sub">{today}</div>
          </div>
        </div>
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <svg
            width="88"
            height="88"
            viewBox="0 0 88 88"
            style={{ marginBottom: 20 }}
          >
            <g transform="translate(44 44)">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <rect
                  key={i}
                  x="-1.5"
                  y="-30"
                  width="3"
                  height="14"
                  rx="1.5"
                  fill="var(--b-gold)"
                  transform={`rotate(${i * 45})`}
                  opacity={0.5 + (i % 3) * 0.15}
                />
              ))}
              <circle
                r="10"
                fill="var(--b-gold-pale)"
                stroke="var(--b-gold)"
                strokeWidth="2"
              />
              <text
                textAnchor="middle"
                dy="4"
                fontSize="14"
                fontFamily="Fraunces"
                fill="var(--b-gold)"
                fontWeight="700"
              >
                ✦
              </text>
            </g>
          </svg>
          <h2 className="section-heading" style={{ marginBottom: 8 }}>
            The wall is ready.
          </h2>
          <p
            className="body muted"
            style={{ maxWidth: 380, margin: '0 auto 24px' }}
          >
            {pack?.emptyState || 'Be the first to recognise someone on your team.'}
          </p>
          <button className="btn btn-celebrate" onClick={onRecognize}>
            <span>✦</span> Recognise a teammate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Recognition feed</h1>
          <div className="sub">{today}</div>
        </div>
      </div>

      <NominationsBanner onVote={onVote} />
      <AnniversaryStrip onCelebrate={onCelebrate} />

      {/* Team spaces */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 16,
          fontSize: 'var(--t-small)',
          overflowX: 'auto',
        }}
      >
        <span className="muted" style={{ paddingTop: 6, marginRight: 4 }}>
          Space:
        </span>
        {['All company', 'Nursing', 'Admin', 'Lab', 'Management'].map(
          (s, i) => (
            <button
              key={s}
              className={'btn btn-sm ' + (i === 0 ? 'btn-primary' : 'btn-ghost')}
              style={{ whiteSpace: 'nowrap' }}
            >
              {i === 0 && '🌿 '}
              {s}
            </button>
          )
        )}
      </div>

      <div className="stat-strip" style={{ marginBottom: 22 }}>
        {stats.map((s, i) => (
          <StatCardAnimated key={i} {...s} />
        ))}
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 22,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {filterOpts.map((f) => (
          <button
            key={f}
            className={'btn btn-sm ' + (filter === f ? 'btn-primary' : 'btn-ghost')}
            onClick={() => setFilter(f)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {f === 'Milestone' ? '🏆 ' : f === 'Spotlight' ? '⭐ ' : ''}
            {f}
          </button>
        ))}
        {filter !== 'All' && (
          <button
            className="btn btn-sm btn-text"
            onClick={() => setFilter('All')}
            style={{ padding: '6px 10px' }}
          >
            <Icon name="close" size={11} /> Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="muted" style={{ marginBottom: 12 }}>
            No recognitions match this filter.
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setFilter('All')}
          >
            Show all
          </button>
        </div>
      ) : (
        <div className="wall">
          {filtered.map((r, i) => (
            <div
              key={r._id || i}
              onClick={() => onOpenRec?.(r)}
              style={{ cursor: 'pointer' }}
            >
              <RecCard
                rec={r}
                isNew={newIds.has(r._id || '')}
                onReact={(rec, e) => {
                  handleReact(rec, e);
                }}
                reactions={getMyReacts(r)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
