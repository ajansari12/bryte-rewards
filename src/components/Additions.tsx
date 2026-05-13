import { useState, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from './Icon';
import { BrandWordmark } from './BrandWordmark';
import type { Recognition } from '@/lib/types';
import { useFocusTrap } from './Extras';
import { useCurrentUser, useCurrentOrg, useOrgUsers, type NotificationPrefs } from '@/lib/queries/users';
import { useBadges } from '@/lib/queries/badges';
import { useLeaderboard } from '@/lib/queries/leaderboard';
import { useCastVote, useMonthlyVotes } from '@/lib/mutations/useCastVote';
import { useRecognitions, useMyRecognitions, type DbRecognition } from '@/lib/queries/recognitions';
import { useComments } from '@/lib/queries/comments';
import { usePostComment } from '@/lib/mutations/usePostComment';
import { useAddReaction } from '@/lib/mutations/useAddReaction';
import { useGiveRecognition } from '@/lib/mutations/useGiveRecognition';
import { useIntegrations, useToggleIntegration, INTEGRATION_CATALOG } from '@/lib/queries/integrations';
import { useOrgValues } from '@/lib/queries/values';
import { useUpdateNotificationPrefs } from '@/lib/mutations/useUpdateNotificationPrefs';
import { useOrgRedemptions } from '@/lib/queries/rewards';
import { useApproveRedemption } from '@/lib/mutations/useApproveRedemption';
import { supabase } from '@/lib/supabase';

const noAnim = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('');

// ─── Fuzzy scorer ────────────────────────────────────────
interface MatchResult { score: number; ranges: [number, number][] }

function scoreMatch(query: string, target: string): MatchResult {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (!q) return { score: 0, ranges: [] };
  const idx = t.indexOf(q);
  if (idx !== -1) return { score: 100 - (t.length - q.length), ranges: [[idx, idx + q.length]] };
  const ranges: [number, number][] = [];
  let qi = 0, score = 0, lastHit = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      const gap = lastHit === -1 ? 0 : ti - lastHit - 1;
      score += 10 - gap * 2;
      if (ranges.length && ranges[ranges.length - 1][1] === ti) {
        ranges[ranges.length - 1][1] = ti + 1;
      } else {
        ranges.push([ti, ti + 1]);
      }
      lastHit = ti;
      qi++;
    }
  }
  if (qi < q.length) return { score: -1, ranges: [] };
  return { score, ranges };
}

function HighlightLabel({ text, ranges }: { text: string; ranges: [number, number][] }) {
  if (!ranges.length) return <span>{text}</span>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) parts.push(<span key={`t${cursor}`}>{text.slice(cursor, start)}</span>);
    parts.push(
      <mark key={`m${start}`} style={{ background: 'var(--b-gold-pale)', color: 'var(--b-gold)', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  }
  if (cursor < text.length) parts.push(<span key={`t${cursor}`}>{text.slice(cursor)}</span>);
  return <span>{parts}</span>;
}

// ─── ProfilePage ────────────────────────────────────────
export function ProfilePage({
  onRecognize,
  onOpenRec,
}: {
  onRecognize: () => void;
  onOpenRec: (rec: Recognition) => void;
}) {
  const { data: currentUser } = useCurrentUser();
  const { data: allBadges = [] } = useBadges();
  const { data: myRecs = [] } = useMyRecognitions();
  const updatePrefs = useUpdateNotificationPrefs();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const openProfileEdit = () => {
    setDraftName(currentUser?.display_name ?? '');
    setDraftTitle(currentUser?.title ?? '');
    setProfileError(null);
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!currentUser) return;
    const name = draftName.trim();
    if (name.length < 2 || name.length > 60) {
      setProfileError('Name must be 2–60 characters.');
      return;
    }
    const title = draftTitle.trim().slice(0, 80);
    setSavingProfile(true);
    setProfileError(null);
    try {
      const { error: updErr } = await supabase
        .from('users')
        .update({ display_name: name, title })
        .eq('id', currentUser.id);
      if (updErr) throw updErr;
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setEditing(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file || !currentUser) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Max 5 MB');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${currentUser.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: updErr } = await supabase
        .from('users')
        .update({ avatar_url: pub.publicUrl })
        .eq('id', currentUser.id);
      if (updErr) throw updErr;
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const earnedBadges = allBadges.filter(b => b.awarded_at !== null);
  const recentRecs = myRecs.slice(0, 3);

  const defaultPrefs: NotificationPrefs = { in_app: true, email_immediate: false, email_digest: true };
  const prefs: NotificationPrefs = currentUser?.notification_prefs ?? defaultPrefs;

  const handlePrefToggle = (key: keyof NotificationPrefs, value: boolean) => {
    if (!currentUser) return;
    updatePrefs.mutate({ userId: currentUser.id, prefs: { ...prefs, [key]: value } });
  };

  const points = currentUser?.points ?? 0;
  const nextThreshold = 5000;
  const pct = Math.min(points / nextThreshold, 1);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  const R = 52, CX = 64, CY = 64, SW = 7;
  const circ = 2 * Math.PI * R;
  const offset = ready && !noAnim() ? circ * (1 - pct) : circ;

  const toRec = (r: DbRecognition): Recognition => ({
    _id: r.id,
    sender: (r.sender as any)?.display_name ?? 'Unknown',
    senderRole: (r.sender as any)?.role ?? 'employee',
    recipient: (r.recipient as any)?.display_name ?? 'Unknown',
    value: (r.value as any)?.name ?? '',
    message: r.message,
    points: r.points,
    time: new Date(r.created_at).toLocaleDateString(),
    type: r.type,
    reactions: {},
  });

  return (
    <div>
      <div className="card" style={{ padding: 32, marginBottom: 24, textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 128, height: 128, margin: '0 auto 16px' }}>
          <svg width="128" height="128" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} aria-hidden="true">
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--b-border)" strokeWidth={SW} />
            <circle
              cx={CX} cy={CY} r={R} fill="none"
              stroke="var(--b-gold)" strokeWidth={SW}
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: noAnim() ? 'none' : 'stroke-dashoffset 900ms cubic-bezier(0.4,0,0.2,1)' }}
            />
          </svg>
          <label
            htmlFor="avatar-upload"
            className={`avatar xl role-${currentUser?.role ?? 'employee'}`}
            style={{
              position: 'absolute', top: SW + 4, left: SW + 4, right: SW + 4, bottom: SW + 4,
              margin: 0, width: 'auto', height: 'auto', fontSize: 28,
              cursor: uploading ? 'wait' : 'pointer', overflow: 'hidden',
              backgroundImage: currentUser?.avatar_url ? `url(${currentUser.avatar_url})` : undefined,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }}
            title="Click to change avatar"
          >
            {!currentUser?.avatar_url && initials(currentUser?.display_name ?? '??')}
            {uploading && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                color: 'var(--b-canvas)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 10, letterSpacing: '0.08em',
              }}>…</div>
            )}
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => handleAvatarUpload(e.target.files?.[0] ?? null)}
          />
        </div>
        {uploadError && (
          <div style={{ color: 'var(--b-rose, #c2410c)', fontSize: 'var(--t-xs)', marginTop: 4 }}>{uploadError}</div>
        )}

        {editing ? (
          <div style={{ maxWidth: 360, margin: '0 auto', textAlign: 'left' }}>
            <label className="label" htmlFor="profile-name" style={{ display: 'block', marginBottom: 4 }}>Display name</label>
            <input
              id="profile-name"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              maxLength={60}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', marginBottom: 10 }}
            />
            <label className="label" htmlFor="profile-title" style={{ display: 'block', marginBottom: 4 }}>Title</label>
            <input
              id="profile-title"
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              maxLength={80}
              placeholder="e.g. Staff Engineer"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)', background: 'var(--b-cream-2)', marginBottom: 10 }}
            />
            {profileError && (
              <div style={{ color: 'var(--b-rose, #c2410c)', fontSize: 'var(--t-xs)', marginBottom: 8 }}>{profileError}</div>
            )}
            <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={savingProfile}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="serif" style={{ fontSize: '1.8rem', fontWeight: 600, margin: 0 }}>{currentUser?.display_name ?? '—'}</h1>
            <div className="muted" style={{ marginTop: 4 }}>{currentUser?.title ?? ''}</div>
            <button
              className="btn-text"
              onClick={openProfileEdit}
              style={{ marginTop: 6, fontSize: 'var(--t-xs)' }}
              aria-label="Edit profile name and title"
            >
              Edit profile
            </button>
          </>
        )}

        <div style={{ margin: '16px auto 0', maxWidth: 260 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
            <span className="label">
              <strong style={{ color: 'var(--b-gold)' }}>{points.toLocaleString()}</strong> pts
            </span>
            <span className="label">Next: {nextThreshold.toLocaleString()}</span>
          </div>
          <div className="progress-linear" style={{ height: 6, borderRadius: 3 }}>
            <div
              className="fill"
              style={{
                width: ready ? `${pct * 100}%` : '0%',
                transition: noAnim() ? 'none' : 'width 900ms cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'center', gap: 36, marginTop: 22 }}>
          <div>
            <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--b-gold)' }}>{points.toLocaleString()}</div>
            <div className="label">points</div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--b-forest)' }}>{earnedBadges.length}</div>
            <div className="label">badges</div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--b-ink)' }}>{myRecs.length}</div>
            <div className="label">received</div>
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={onRecognize}>
          <Icon name="sparkle" size={14} /> Recognise someone
        </button>
      </div>

      <h2 className="serif" style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 12px' }}>Badges</h2>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {earnedBadges.length === 0 ? (
          <div className="muted" style={{ fontSize: 'var(--t-sm)' }}>No badges earned yet.</div>
        ) : earnedBadges.map(b => (
          <div key={b.id} className="card" style={{ padding: '10px 14px' }}>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ fontSize: 20 }}>{b.icon}</span>
              <div>
                <div className="serif" style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{b.name}</div>
                <div className="muted" style={{ fontSize: 9 }}>{b.awarded_at ? new Date(b.awarded_at).toLocaleDateString() : ''}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="serif" style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 12px' }}>Recent recognitions</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {recentRecs.length === 0 ? (
          <div className="muted" style={{ fontSize: 'var(--t-sm)' }}>No recognitions received yet.</div>
        ) : recentRecs.map(r => {
          const rec = toRec(r);
          return (
            <div key={r.id} className="rec-card" style={{ cursor: 'pointer' }} onClick={() => onOpenRec(rec)}>
              <div className="strip" style={{ background: 'var(--b-gold)' }} />
              <div style={{ padding: '14px 16px' }}>
                <div className="row" style={{ gap: 10, marginBottom: 6 }}>
                  {rec.value && <span className="chip-mini">{rec.value}</span>}
                  <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>· {rec.time}</span>
                  <span className="grow" />
                  <span className="mono" style={{ color: 'var(--b-gold)', fontWeight: 700, fontSize: 'var(--t-xs)' }}>+{rec.points}</span>
                </div>
                <div style={{ fontSize: 'var(--t-sm)', lineHeight: 1.5 }}>"{rec.message}"</div>
                <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 6 }}>From {rec.sender}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notification preferences */}
      <h2 className="serif" style={{ fontSize: '1.1rem', fontWeight: 600, margin: '28px 0 12px' }}>Notification settings</h2>
      <div className="card" style={{ padding: 20 }}>
        {(
          [
            { key: 'in_app' as const, label: 'In-app notifications', sub: 'Bell badge and notification panel' },
            { key: 'email_immediate' as const, label: 'Immediate email', sub: 'Email the moment you\'re recognised' },
            { key: 'email_digest' as const, label: 'Weekly digest', sub: 'Monday morning summary of the week\'s highlights' },
          ] as const
        ).map(({ key, label, sub }, i, arr) => (
          <div key={key} className="row" style={{
            padding: '14px 0',
            borderBottom: i < arr.length - 1 ? '1px solid var(--b-border-soft)' : 'none',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--b-ink)', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 'var(--t-xs)', color: 'var(--b-ink-3)', marginTop: 2 }}>{sub}</div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={e => handlePrefToggle(key, e.target.checked)}
                disabled={updatePrefs.isPending}
              />
              <span className="track" /><span className="thumb" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SearchPalette ──────────────────────────────────────
export function SearchPalette({ onClose, onJump }: { onClose: () => void; onJump: (route: string, personId?: string) => void }) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { data: orgUsers = [] } = useOrgUsers();

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  type Item = { kind: 'action' | 'page' | 'person'; label: string; icon: string; route: string; sub?: string; personId?: string };

  const BASE_ITEMS: Item[] = useMemo(() => [
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
  ], []);

  const PEOPLE_ITEMS: Item[] = useMemo(
    () => orgUsers.map(u => ({
      kind: 'person' as const,
      label: u.display_name,
      icon: 'users',
      route: '__recognize',
      sub: u.title || u.role,
      personId: u.id,
    })),
    [orgUsers],
  );

  const ALL_ITEMS = useMemo(() => [...BASE_ITEMS, ...PEOPLE_ITEMS], [BASE_ITEMS, PEOPLE_ITEMS]);

  const scored = useMemo(() => {
    if (!q) return ALL_ITEMS.map(i => ({ ...i, score: 0, ranges: [] as [number, number][] }));
    return ALL_ITEMS
      .map(item => { const m = scoreMatch(q, item.label); return { ...item, ...m }; })
      .filter(item => item.score >= 0)
      .sort((a, b) => b.score - a.score);
  }, [q, ALL_ITEMS]);

  const actions = scored.filter(item => item.kind === 'action');
  const pages = scored.filter(item => item.kind === 'page');
  const people = scored.filter(item => item.kind === 'person');
  const flatItems = q ? scored : [...actions, ...pages, ...people];

  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [q]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, flatItems.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && flatItems[active]) { onJump(flatItems[active].route, flatItems[active].personId); onClose(); }
  };

  const renderItem = (item: typeof flatItems[0], globalIdx: number) => (
    <button
      key={item.label}
      data-idx={globalIdx}
      onMouseEnter={() => setActive(globalIdx)}
      onClick={() => { onJump(item.route, item.personId); onClose(); }}
      className="row"
      style={{
        width: '100%', padding: '10px 14px', gap: 12,
        background: globalIdx === active ? 'var(--b-cream-2)' : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--b-ink)',
        transition: 'background 80ms var(--ease)',
      }}
    >
      <Icon name={item.icon} size={14} style={{ color: 'var(--b-ink-3)', flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        <HighlightLabel text={item.label} ranges={item.ranges} />
      </span>
      <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>{item.kind}</span>
    </button>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="card"
        style={{ width: 'min(560px, 92vw)', maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="row" style={{ padding: 14, borderBottom: '1px solid var(--b-border-soft)', gap: 10 }}>
          <Icon name="search" size={16} style={{ color: 'var(--b-ink-3)', flexShrink: 0 }} />
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
        <div ref={listRef} style={{ overflow: 'auto', maxHeight: '50vh' }}>
          {flatItems.length === 0 && <div className="muted" style={{ padding: 22, textAlign: 'center' }}>Nothing matches "{q}".</div>}

          {!q && actions.length > 0 && (
            <>
              <div className="label" style={{ padding: '10px 14px 4px', fontSize: 10 }}>Actions</div>
              {actions.map((item, i) => renderItem(item, i))}
            </>
          )}
          {!q && pages.length > 0 && (
            <>
              <div className="label" style={{ padding: '10px 14px 4px', fontSize: 10 }}>Pages</div>
              {pages.map((item, i) => renderItem(item, actions.length + i))}
            </>
          )}
          {!q && people.length > 0 && (
            <>
              <div className="label" style={{ padding: '10px 14px 4px', fontSize: 10 }}>Teammates</div>
              {people.slice(0, 8).map((item, i) => renderItem(item, actions.length + pages.length + i))}
            </>
          )}
          {q && flatItems.map((item, i) => renderItem(item, i))}
        </div>
      </div>
    </div>
  );
}

// ─── RecognitionDetail ──────────────────────────────────
const QUICK_REACTIONS = ['❤️', '🙌', '🔥', '✦', '💛'];

export function RecognitionDetail({ rec, onClose, onRecognize, onPrint }: { rec: Recognition; onClose: () => void; onRecognize: () => void; onPrint?: () => void }) {
  const trapRef = useFocusTrap(true, onClose);
  const recognitionId = rec._id ?? null;
  const { data: dbComments = [] } = useComments(recognitionId);
  const { data: currentUser } = useCurrentUser();
  const postComment = usePostComment();
  const addReaction = useAddReaction();

  const [reactions, setReactions] = useState<Record<string, number>>({ ...rec.reactions });
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [reply, setReply] = useState('');

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const toggleReaction = (emoji: string) => {
    if (!currentUser?.id || !currentUser?.org_id || !recognitionId) return;
    const wasMine = myReactions.has(emoji);
    setMyReactions(prev => {
      const next = new Set(prev);
      if (wasMine) {
        next.delete(emoji);
        setReactions(r => ({ ...r, [emoji]: Math.max(0, (r[emoji] || 0) - 1) }));
      } else {
        next.add(emoji);
        setReactions(r => ({ ...r, [emoji]: (r[emoji] || 0) + 1 }));
      }
      return next;
    });
    addReaction.mutate({
      recognition_id: recognitionId,
      user_id: currentUser.id,
      emoji,
      org_id: currentUser.org_id,
      toggle: !wasMine,
    });
  };

  const sendComment = () => {
    const body = reply.trim();
    if (!body || !currentUser?.id || !recognitionId) return;
    postComment.mutate(
      { recognition_id: recognitionId, author_id: currentUser.id, body },
      { onSuccess: () => setReply('') }
    );
  };

  const onReplyKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && reply.trim()) {
      sendComment();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={trapRef}
        className="card"
        style={{ width: 'min(640px, 92vw)', maxHeight: '88vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Recognition detail"
      >
        <div className="row" style={{ padding: 18, borderBottom: '1px solid var(--b-border-soft)' }}>
          <div className="grow">
            <div className="row" style={{ gap: 8 }}>
              <span className="chip-mini">{rec.value}</span>
              <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>· {rec.time}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={14} /></button>
        </div>

        <div style={{ padding: 22 }}>
          <div className="row" style={{ gap: 12, marginBottom: 16 }}>
            <div className={`avatar md role-${rec.senderRole === 'manager' ? 'manager' : 'employee'}`}>{initials(rec.sender)}</div>
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

          {/* Reactions */}
          <div className="row" style={{ gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
            {Object.entries(reactions).filter(([, count]) => (count as number) > 0).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                style={{
                  padding: '4px 10px', cursor: 'pointer', border: 'none',
                  background: myReactions.has(emoji) ? 'var(--b-gold-pale)' : 'var(--b-surface)',
                  outline: myReactions.has(emoji) ? '1.5px solid var(--b-gold-border)' : '1.5px solid transparent',
                  borderRadius: 'var(--r-pill)', fontSize: 'var(--t-sm)',
                  transition: 'all 120ms var(--ease)',
                }}
              >
                {emoji} {count as number}
              </button>
            ))}
            {QUICK_REACTIONS.filter(e => !(reactions[e] > 0)).map(emoji => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                style={{
                  padding: '4px 10px', cursor: 'pointer', border: 'none',
                  background: 'var(--b-surface)', borderRadius: 'var(--r-pill)',
                  fontSize: 'var(--t-sm)', opacity: 0.5,
                  transition: 'opacity 120ms var(--ease)',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; }}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Comments */}
          <div style={{ marginTop: 22 }}>
            <div className="label" style={{ marginBottom: 10 }}>Comments</div>
            {dbComments.length === 0 && (
              <div className="muted" style={{ fontSize: 'var(--t-sm)', padding: '6px 0' }}>
                Be the first to leave a note.
              </div>
            )}
            {dbComments.map((c, i) => {
              const name = c.author?.display_name ?? 'Teammate';
              const role = c.author?.role ?? 'employee';
              return (
                <div key={c.id} className="row" style={{ gap: 10, padding: '10px 0', borderTop: i > 0 ? '1px solid var(--b-border-soft)' : 'none' }}>
                  <div className={`avatar sm role-${role}`}>{initials(name)}</div>
                  <div className="grow">
                    <div className="row" style={{ gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{name}</span>
                      <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>· {relTime(c.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 'var(--t-sm)', marginTop: 2 }}>{c.body}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply */}
          <div style={{ marginTop: 18 }}>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={onReplyKey}
              rows={2}
              placeholder="Add a comment… (⌘↵ to send)"
              style={{
                width: '100%', padding: '10px 12px',
                fontFamily: 'var(--f-serif)', fontSize: 'var(--t-sm)',
                border: '1px solid var(--b-border)', borderRadius: 'var(--r-sm)',
                background: 'var(--b-cream-2)', color: 'var(--b-ink)', resize: 'none',
                outline: 'none', transition: 'border-color 120ms var(--ease)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--b-gold-border)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--b-border)'; }}
            />
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6, gap: 8 }}>
              <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>{reply.length}/280</span>
              <button
                className="btn btn-primary btn-sm"
                disabled={reply.trim().length < 1 || postComment.isPending}
                onClick={sendComment}
              >
                {postComment.isPending ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>

        <div className="row" style={{ padding: 14, borderTop: '1px solid var(--b-border-soft)', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          <span className="grow" />
          {onPrint && (
            <button className="btn btn-ghost btn-sm" onClick={onPrint} title="Open printable kudos board">
              <Icon name="gift" size={12} /> Print kudos
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={onRecognize}>
            <Icon name="sparkle" size={12} /> Recognise back
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DigestPreview ──────────────────────────────────────
export function DigestPreview({ onClose, onToast }: { onClose: () => void; onToast?: (t: { kind?: 'success' | 'error' | 'info'; msg: string }) => void }) {
  const trapRef = useFocusTrap(true, onClose);
  const { data: org } = useCurrentOrg();
  const { data: currentUser } = useCurrentUser();
  const { data: dbRecs = [] } = useRecognitions();
  const [sending, setSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState<string>('');

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setRecipientEmail(data.user?.email ?? '');
    });
    return () => { active = false; };
  }, []);

  const since = Date.now() - 7 * 86_400_000;
  const weekRecs = dbRecs.filter(r => new Date(r.created_at).getTime() >= since);
  const recs = weekRecs.slice(0, 3).map(r => ({
    value: (r.value as any)?.name ?? '',
    time: new Date(r.created_at).toLocaleDateString(),
    message: r.message,
    sender: (r.sender as any)?.display_name ?? 'Someone',
    recipient: (r.recipient as any)?.display_name ?? 'a teammate',
  }));
  const display = recs;

  const stats = {
    recognitions: weekRecs.length,
    teammates: new Set(weekRecs.map(r => (r.recipient as any)?.id).filter(Boolean)).size,
    points: weekRecs.reduce((s, r) => s + (r.points ?? 0), 0),
  };

  const orgName = org?.name ?? 'Your Organisation';
  const firstName = currentUser?.display_name?.split(' ')[0] ?? 'there';

  const handleSend = async () => {
    if (!currentUser) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weekly-digest`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );
      if (res.ok) {
        onToast?.({ kind: 'success', msg: 'Digest sent — check your inbox ✦' });
        onClose();
      } else {
        onToast?.({ kind: 'info', msg: 'Digest is sent automatically each Monday at 9am.' });
        onClose();
      }
    } catch {
      onToast?.({ kind: 'info', msg: 'Digest is sent automatically each Monday at 9am.' });
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={trapRef}
        className="card"
        style={{ width: 'min(600px, 92vw)', maxHeight: '88vh', overflow: 'auto', padding: 0 }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Weekly digest preview"
      >
        {/* Chrome header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--b-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="serif" style={{ fontWeight: 600, fontSize: '1.05rem' }}>Weekly digest preview</div>
            <div className="muted" style={{ fontSize: 'var(--t-xs)' }}>
              Sent every Monday, 9am local{recipientEmail ? <> · <span style={{ fontFamily: 'var(--font-mono)' }}>{recipientEmail}</span></> : null}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={14} /></button>
        </div>

        {/* Email frame */}
        <div style={{ background: 'var(--b-canvas)', padding: 24 }}>
          <div style={{ maxWidth: 520, margin: '0 auto', background: 'var(--b-card)', borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--b-border-soft)' }}>
            {/* Dark header */}
            <div style={{ background: 'var(--b-ink)', padding: '28px 32px' }}>
              <BrandWordmark size="md" tone="on-dark" suffix="Weekly Digest" />
              <div style={{ marginTop: 6, fontSize: 'var(--t-xs)', color: 'rgba(250,246,239,0.5)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {orgName} · Past 7 days
              </div>
            </div>
            {/* Gold separator */}
            <div style={{ height: 3, background: 'linear-gradient(90deg, var(--b-gold), var(--b-gold-light), transparent)' }} />

            <div style={{ padding: '24px 32px' }}>
              <p style={{ fontSize: '1rem', color: 'var(--b-ink)', lineHeight: 1.6, margin: '0 0 24px' }}>
                Hi {firstName} — here's what happened on your team wall this week. ✦
              </p>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
                {[
                  { v: stats.recognitions.toString(), l: 'recognitions', c: 'var(--b-gold)' },
                  { v: stats.teammates.toString(), l: 'teammates', c: 'var(--b-forest)' },
                  { v: stats.points.toLocaleString(), l: 'points given', c: 'var(--b-ink)' },
                ].map(s => (
                  <div key={s.l} style={{ textAlign: 'center', padding: '14px 10px', background: 'var(--b-surface)', borderRadius: 'var(--r-md)' }}>
                    <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: s.c }}>{s.v}</div>
                    <div className="label" style={{ marginTop: 4 }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Section divider */}
              <div className="row" style={{ gap: 12, alignItems: 'center', marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--b-border-soft)' }} />
                <span className="label" style={{ fontSize: 10, letterSpacing: '0.08em' }}>THIS WEEK'S HIGHLIGHTS</span>
                <div style={{ flex: 1, height: 1, background: 'var(--b-border-soft)' }} />
              </div>

              {display.map((r, i) => (
                <div key={i} style={{ padding: '14px 16px', marginBottom: 10, background: 'var(--b-surface)', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--b-gold)' }}>
                  <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                    <span className="chip-mini">{r.value}</span>
                    <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>· {r.time}</span>
                  </div>
                  <div style={{ fontSize: 'var(--t-sm)', lineHeight: 1.5, fontStyle: 'italic', color: 'var(--b-ink-2)' }}>"{r.message}"</div>
                  <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 6 }}>{r.sender} → {r.recipient}</div>
                </div>
              ))}

              {/* CTA */}
              <div style={{ textAlign: 'center', marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--b-border-soft)' }}>
                <span style={{
                  display: 'inline-block', padding: '12px 28px',
                  background: 'var(--b-gold)', color: 'var(--b-ink)',
                  borderRadius: 'var(--r-pill)', fontWeight: 700, fontSize: '0.9rem',
                }}>
                  View full wall →
                </span>
                <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 12, lineHeight: 1.6 }}>
                  You're receiving this because weekly digest is enabled.<br />
                  Manage preferences in your profile.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row" style={{ padding: 14, borderTop: '1px solid var(--b-border-soft)', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          <span className="grow" />
          <button className="btn btn-primary btn-sm" onClick={handleSend} disabled={sending}>
            {sending ? 'Sending…' : 'Send to me now'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BillingPanel ───────────────────────────────────────
export function BillingPanel() {
  const { data: org, isLoading } = useCurrentOrg();
  const { data: user } = useCurrentUser();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const planLabel: Record<string, string> = {
    free: 'Free',
    growth: 'Growth',
    enterprise: 'Enterprise',
  };
  const plan = org?.plan ?? 'free';
  const planName = planLabel[plan] ?? plan;
  const pointsRemaining = org?.points_pool_remaining ?? 0;
  const quarterlyPool = org?.quarterly_pool ?? 24000;
  const renewalDate = org?.renewal_date
    ? new Date(org.renewal_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const last4 = org?.payment_method_last4;
  const billingStatus = org?.billing_status ?? 'active';
  const statusPillLabel: Record<string, string> = {
    active: plan === 'free' ? 'Free' : 'Active',
    past_due: 'Past due',
    canceled: 'Cancelled',
  };
  const statusPillClass = billingStatus === 'past_due' || billingStatus === 'canceled'
    ? 'pill'
    : (plan === 'free' ? 'pill' : 'pill gold');

  const emitToast = (kind: 'success' | 'error' | 'info', msg: string) => {
    window.dispatchEvent(new CustomEvent('bryte:toast', { detail: { kind, msg } }));
  };

  const handleChangePlan = async (priceId: string) => {
    if (!user) return;
    setCheckoutLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            price_id: priceId,
            success_url: window.location.href + '?billing=success',
            cancel_url: window.location.href,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        emitToast('error', data?.message || 'Could not start checkout. Please try again.');
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      emitToast('error', err instanceof Error ? err.message : 'Could not start checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    setCheckoutLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-portal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ return_url: window.location.href }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        emitToast('error', data?.message || 'Could not open billing portal. Please try again.');
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      emitToast('error', err instanceof Error ? err.message : 'Could not open billing portal.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 28, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="muted">Loading billing info…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="card" style={{ padding: 28 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div className="serif italic" style={{ fontSize: 'var(--t-xs)', color: 'var(--b-gold)', marginBottom: 4 }}>Current subscription</div>
              <div className="h2">{planName} plan</div>
              <div className="muted" style={{ fontSize: 'var(--t-small)', marginTop: 6 }}>
                {renewalDate !== '—' ? `Next renewal ${renewalDate}` : 'No active subscription'}
                {last4 && ` · ····${last4}`}
              </div>
            </div>
            <span className={statusPillClass} style={billingStatus === 'past_due' ? { background: 'var(--b-terra-pale, #fde4dc)', color: 'var(--b-terra, #a0532c)' } : undefined}>
              {statusPillLabel[billingStatus]}
            </span>
          </div>
          {billingStatus === 'past_due' && (
            <div role="status" style={{
              padding: '10px 14px', borderRadius: 'var(--r-md)', marginBottom: 18,
              background: 'var(--b-terra-pale, #fde4dc)', border: '1px solid var(--b-terra, #a0532c)',
              fontSize: 'var(--t-sm)', color: 'var(--b-terra, #a0532c)',
            }}>
              Your last invoice failed. Update your payment method to keep recognition flowing.{' '}
              <button className="btn-text" style={{ color: 'inherit', fontWeight: 600 }} onClick={handleManageSubscription}>
                Manage billing →
              </button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { l: 'Next renewal', v: renewalDate, sub: plan === 'free' ? 'No subscription' : 'Auto-renews' },
              { l: 'Points pool remaining', v: pointsRemaining.toLocaleString(), sub: `of ${quarterlyPool.toLocaleString()}` },
              { l: 'Current plan', v: planName, sub: plan === 'free' ? 'Upgrade to unlock more' : 'Billed monthly' },
            ].map(s => (
              <div key={s.l} style={{ padding: '14px 16px', background: 'var(--b-surface)', borderRadius: 'var(--r-md)' }}>
                <div className="label">{s.l}</div>
                <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--b-ink)', marginTop: 4 }}>{s.v}</div>
                <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 10 }}>
            {plan === 'free' && (
              <button
                className="btn btn-primary"
                disabled={checkoutLoading}
                onClick={() => handleChangePlan(import.meta.env.VITE_STRIPE_GROWTH_PRICE_ID ?? 'price_growth')}
              >
                {checkoutLoading ? 'Redirecting…' : 'Upgrade to Growth →'}
              </button>
            )}
            {plan === 'growth' && (
              <button
                className="btn btn-ghost"
                disabled={checkoutLoading}
                onClick={handleManageSubscription}
              >
                {checkoutLoading ? 'Redirecting…' : 'Manage subscription →'}
              </button>
            )}
          </div>
        </div>
        <div className="card" style={{ padding: '16px 24px' }}>
          <div className="h3" style={{ marginBottom: 12 }}>Billing events</div>
          <BillingEventsList orgId={org?.id} />
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
        <a href="mailto:sales@bryte.app" className="btn btn-primary btn-block" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Talk to us →</a>
      </div>
    </div>
  );
}

function BillingEventsList({ orgId }: { orgId?: string }) {
  const [events, setEvents] = useState<Array<{ id: string; event_type: string; plan: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    supabase
      .from('billing_events')
      .select('id, event_type, plan, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setEvents((data ?? []) as typeof events);
        setLoading(false);
      });
  }, [orgId]);

  if (loading) return <div className="muted" style={{ fontSize: 'var(--t-small)', padding: '8px 0' }}>Loading…</div>;
  if (events.length === 0) return <div className="muted" style={{ fontSize: 'var(--t-small)', padding: '8px 0' }}>No billing events yet. Events will appear here once a Stripe subscription is active.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {events.map((e, i) => (
        <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px', gap: 14, padding: '12px 0', borderBottom: i < events.length - 1 ? '1px solid var(--b-border-soft)' : 'none', alignItems: 'center', fontSize: 'var(--t-small)' }}>
          <span style={{ color: 'var(--b-ink-3)', fontFamily: 'monospace', fontSize: 'var(--t-xs)' }}>{e.event_type}</span>
          <span className="pill" style={{ width: 'fit-content', background: e.plan === 'enterprise' ? 'var(--b-gold-pale)' : undefined }}>{e.plan}</span>
          <span className="muted mono" style={{ fontSize: 'var(--t-xs)' }}>{new Date(e.created_at).toLocaleDateString('en-CA')}</span>
        </div>
      ))}
    </div>
  );
}

// ─── IntegrationsPanel ──────────────────────────────────
export function IntegrationsPanel() {
  const { data: user } = useCurrentUser();
  const { data: connected = [] } = useIntegrations();
  const toggle = useToggleIntegration();
  const isAdmin = user?.role === 'admin';
  const connectedKinds = new Set(connected.map(c => c.kind));

  return (
    <div>
      <div className="h3 mb-4">Connected apps</div>
      <div className="muted" style={{ fontSize: 'var(--t-small)', marginBottom: 20, maxWidth: 500 }}>
        HRIS, SSO, and workflow connectors. Admins can toggle which integrations are connected; some require plan upgrades to activate fully.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {INTEGRATION_CATALOG.map(app => {
          const isConnected = connectedKinds.has(app.kind);
          return (
            <div key={app.kind} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: app.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
                  {app.name[0]}
                </div>
                <div className="grow">
                  <div className="serif" style={{ fontWeight: 600, color: 'var(--b-ink)' }}>{app.name}</div>
                  {isConnected && <div className="muted" style={{ fontSize: 10, color: 'var(--b-forest)' }}>Connected</div>}
                </div>
              </div>
              <div className="muted" style={{ fontSize: 'var(--t-xs)', lineHeight: 1.5, minHeight: 30 }}>{app.desc}</div>
              <button
                className={`btn btn-sm ${isConnected ? 'btn-ghost' : 'btn-primary'}`}
                style={{ marginTop: 'auto' }}
                disabled={!isAdmin || toggle.isPending}
                onClick={() => toggle.mutate({ kind: app.kind, connect: !isConnected })}
                title={!isAdmin ? 'Only admins can change integrations' : undefined}
              >
                {isConnected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── NominationsBanner ──────────────────────────────────
export function NominationsBanner() {
  const { data: leaderboard = [] } = useLeaderboard('month');
  const { data: currentUser } = useCurrentUser();
  const { data: votes = [] } = useMonthlyVotes();
  const castVote = useCastVote();
  const top = useMemo(() => leaderboard.slice(0, 3).map(l => ({
    id: l.user_id,
    name: l.display_name,
    role: l.role,
    points: l.points,
    quote: `${l.points.toLocaleString()} pts recognised this month.`,
  })), [leaderboard]);

  const voteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of votes) counts[v.nominee_id] = (counts[v.nominee_id] ?? 0) + 1;
    return counts;
  }, [votes]);

  const myVote = useMemo(
    () => votes.find(v => v.voter_id === currentUser?.id)?.nominee_id ?? null,
    [votes, currentUser?.id],
  );

  if (top.length === 0) return null;

  const now = new Date();
  const monthName = now.toLocaleString(undefined, { month: 'long' });
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.max(0, Math.ceil((monthEnd.getTime() - now.getTime()) / 86_400_000));
  const endsLabel = daysLeft === 0
    ? 'Ends today'
    : daysLeft === 1
      ? 'Ends tomorrow'
      : `Ends in ${daysLeft} days`;

  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--b-ink) 0%, var(--b-ink-2) 100%)',
      borderRadius: 'var(--r-lg)', padding: '22px 28px', marginBottom: 22,
      color: 'var(--b-canvas)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', right: -20, top: -40, fontSize: 200, color: 'rgba(194,136,45,0.08)', fontFamily: 'Fraunces', lineHeight: 1 }}>★</div>
      <div style={{ position: 'relative', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', minWidth: 200 }}>
          <div className="serif italic" style={{ fontSize: '0.85rem', color: 'var(--b-gold-light)', marginBottom: 6 }}>{endsLabel}</div>
          <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--b-canvas)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Teammate of {monthName}
          </div>
          <div style={{ fontSize: 'var(--t-small)', color: 'rgba(250,246,239,0.7)', marginTop: 6, lineHeight: 1.5 }}>
            Vote for who lit up the wall this month. Winner gets CA$200 + their name on the lobby wall.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flex: '2 1 400px', flexWrap: 'wrap' }}>
          {top.map(n => {
            const voted = myVote === n.id;
            const count = voteCounts[n.id] ?? 0;
            return (
            <button key={n.id} disabled={castVote.isPending} onClick={async () => {
              try {
                await castVote.mutateAsync(n.id);
              } catch {/* ignore */}
            }} style={{
              background: voted ? 'var(--b-gold)' : 'rgba(255,255,255,0.06)',
              border: '1px solid ' + (voted ? 'var(--b-gold)' : 'rgba(255,255,255,0.12)'),
              borderRadius: 'var(--r-md)', padding: '12px 14px',
              cursor: castVote.isPending ? 'wait' : 'pointer', flex: '1 1 140px',
              textAlign: 'left', transition: 'all 200ms var(--ease)',
              color: voted ? '#FAF6EF' : 'var(--b-canvas)',
            }}
            onMouseEnter={e => { if (!voted) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { if (!voted) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
              <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                <div className={`avatar sm role-${n.role}`} style={{ border: '2px solid rgba(255,255,255,0.2)' }}>{initials(n.name)}</div>
                <div>
                  <div className="serif" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{n.name}</div>
                  <div style={{ fontSize: 9, opacity: 0.7 }}>{n.points.toLocaleString()} pts · {count} vote{count === 1 ? '' : 's'}</div>
                </div>
              </div>
              <div style={{ fontSize: 'var(--t-xs)', opacity: 0.8, fontStyle: 'italic', lineHeight: 1.4 }}>"{n.quote}"</div>
              {voted && <div style={{ fontSize: 10, fontWeight: 700, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={10} stroke={3} /> VOTED</div>}
            </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── AnniversaryStrip ───────────────────────────────────
// Shows upcoming work anniversaries based on users.start_date — the anniversary
// day in the current year, looking 14 days ahead.
export function AnniversaryStrip() {
  const { data: users = [] } = useOrgUsers();
  const { data: currentUser } = useCurrentUser();
  const { data: recentRecs = [] } = useRecognitions();
  const { data: orgValues = [] } = useOrgValues();
  const giveRecognition = useGiveRecognition();
  const [celebratedIds, setCelebratedIds] = useState<Set<string>>(new Set());
  const milestoneValue = orgValues[0];

  const alreadyCelebratedThisYear = useMemo(() => {
    const yearStart = new Date();
    yearStart.setMonth(0, 1);
    yearStart.setHours(0, 0, 0, 0);
    const ids = new Set<string>();
    for (const r of recentRecs) {
      if (r.type !== 'milestone') continue;
      if (new Date(r.created_at).getTime() < yearStart.getTime()) continue;
      if (r.recipient_id) ids.add(r.recipient_id);
    }
    return ids;
  }, [recentRecs]);

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 14);

    const items = users
      .filter(u => !!u.start_date)
      .map(u => {
        const start = new Date(u.start_date!);
        const anniv = new Date(today.getFullYear(), start.getMonth(), start.getDate());
        if (anniv < today) anniv.setFullYear(anniv.getFullYear() + 1);
        const years = anniv.getFullYear() - start.getFullYear();
        return {
          id: u.id,
          name: u.display_name,
          years,
          date: anniv.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
          tenure: `${years}Y`,
          when: anniv,
        };
      })
      .filter(a => a.years >= 1 && a.when >= today && a.when <= horizon)
      .sort((a, b) => a.when.getTime() - b.when.getTime());
    return items;
  }, [users]);

  if (upcoming.length === 0) return null;

  const handleCelebrate = async (a: typeof upcoming[number]) => {
    if (!currentUser || a.id === currentUser.id || celebratedIds.has(a.id) || alreadyCelebratedThisYear.has(a.id)) return;
    if (!milestoneValue) return;
    setCelebratedIds(prev => new Set(prev).add(a.id));
    try {
      await giveRecognition.mutateAsync({
        org_id: currentUser.org_id,
        sender_id: currentUser.id,
        recipient_id: a.id,
        value_id: milestoneValue.id,
        message: `Happy ${a.years}-year anniversary, ${a.name.split(' ')[0]}. Thank you for everything you bring to this team.`,
        points: Math.max(50, a.years * 10),
        type: 'milestone',
        _senderName: currentUser.display_name,
        _senderRole: currentUser.role,
        _recipientName: a.name,
        _valueName: milestoneValue.name,
        _valueIcon: milestoneValue.icon,
      });
    } catch {
      setCelebratedIds(prev => {
        const next = new Set(prev);
        next.delete(a.id);
        return next;
      });
    }
  };

  return (
    <div style={{ background: 'var(--b-forest-pale)', border: '1px solid var(--b-forest-border)', borderRadius: 'var(--r-lg)', padding: '16px 22px', marginBottom: 22 }}>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 auto' }}>
          <div className="serif italic" style={{ fontSize: 'var(--t-xs)', color: 'var(--b-forest)', fontWeight: 600 }}>Next two weeks</div>
          <div className="serif" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--b-ink)', marginTop: 2 }}>Anniversaries</div>
        </div>
        <div className="row flex-wrap" style={{ gap: 8, flex: 1, justifyContent: 'flex-end' }}>
          {upcoming.map(a => {
            const done = celebratedIds.has(a.id) || alreadyCelebratedThisYear.has(a.id);
            const isSelf = a.id === currentUser?.id;
            return (
              <div key={a.id} className="row" style={{ gap: 8, background: 'var(--b-card)', padding: '6px 12px', borderRadius: 'var(--r-pill)', border: '1px solid var(--b-forest-border)' }}>
                <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--b-forest)' }}>{a.years}Y</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--b-ink)', fontWeight: 500 }}>{a.name}</span>
                <span className="muted" style={{ fontSize: 10 }}>· {a.date}</span>
                {!isSelf && (
                  <button
                    className="btn-text"
                    style={{ fontSize: 10, opacity: done ? 0.6 : 1 }}
                    disabled={done || giveRecognition.isPending}
                    onClick={() => handleCelebrate(a)}
                  >
                    {done ? 'Celebrated ✦' : 'Celebrate →'}
                  </button>
                )}
              </div>
            );
          })}
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
