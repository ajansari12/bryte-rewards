import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';
import {
  universalRewards,
  industryOnlyRewards,
  rewardDedupKey,
  REWARD_INDUSTRIES,
  type RewardSeed,
  type RewardIndustry,
} from '@/lib/onboardingPresets';
import { BRYTE_DATA } from '@/lib/data';

type Toast = { kind?: 'success' | 'error' | 'info'; msg: string };

interface ExistingReward {
  title: string;
  brand: string;
  denom: string;
}

interface Props {
  orgId: string;
  orgIndustry: string;
  existing: ExistingReward[];
  onClose: () => void;
  onToast: (t: Toast) => void;
  initiallySelectAll?: boolean;
}

interface CatalogRow extends RewardSeed {
  group: string;
  fromPack: string | null;
  duplicate: boolean;
}

export function StarterRewardsPicker({
  orgId,
  orgIndustry,
  existing,
  onClose,
  onToast,
  initiallySelectAll = false,
}: Props) {
  const qc = useQueryClient();
  const fallbackIndustry: RewardIndustry = (REWARD_INDUSTRIES as readonly string[]).includes(orgIndustry)
    ? (orgIndustry as RewardIndustry)
    : 'technology';
  const [industry, setIndustry] = useState<RewardIndustry>(fallbackIndustry);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const existingKeys = useMemo(
    () => new Set(existing.map(r => rewardDedupKey(r))),
    [existing]
  );

  const catalog: CatalogRow[] = useMemo(() => {
    const universal = universalRewards().map<CatalogRow>(r => ({
      ...r,
      group: 'Universal',
      fromPack: null,
      duplicate: existingKeys.has(rewardDedupKey(r)),
    }));
    const industryRows = industryOnlyRewards(industry).map<CatalogRow>(r => ({
      ...r,
      group: groupFor(r.kind),
      fromPack: industry === orgIndustry ? null : BRYTE_DATA.INDUSTRIES[industry]?.name ?? industry,
      duplicate: existingKeys.has(rewardDedupKey(r)),
    }));
    return [...universal, ...industryRows];
  }, [industry, existingKeys, orgIndustry]);

  useEffect(() => {
    if (initiallySelectAll) {
      setSelected(new Set(catalog.filter(r => !r.duplicate).map(itemKey)));
    }
  }, [initiallySelectAll, catalog]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const toggle = (key: string, duplicate: boolean) => {
    if (duplicate) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectable = catalog.filter(r => !r.duplicate);
  const allSelected = selectable.length > 0 && selectable.every(r => selected.has(itemKey(r)));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(selectable.map(itemKey)));
  };

  const selectedRows = catalog.filter(r => selected.has(itemKey(r)) && !r.duplicate);
  const totalSelected = selectedRows.length;
  const pointsMin = selectedRows.length ? Math.min(...selectedRows.map(r => r.points)) : 0;
  const pointsMax = selectedRows.length ? Math.max(...selectedRows.map(r => r.points)) : 0;

  const groups: { key: string; rows: CatalogRow[] }[] = useMemo(() => {
    const order = ['Universal', 'Gift cards', 'Experiences', 'Donations'];
    const buckets: Record<string, CatalogRow[]> = {};
    for (const row of catalog) {
      (buckets[row.group] ??= []).push(row);
    }
    return order
      .filter(k => buckets[k]?.length)
      .map(k => ({ key: k, rows: buckets[k] }));
  }, [catalog]);

  const submit = async () => {
    if (!selectedRows.length) return;
    setSaving(true);
    try {
      const rows = selectedRows.map(r => ({
        org_id: orgId,
        title: r.title,
        brand: r.brand,
        denom: r.denom,
        points: r.points,
        color: r.color,
        kind: r.kind,
        active: true,
      }));
      const { error } = await supabase.from('rewards').insert(rows);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: qk.rewards(orgId) });
      qc.invalidateQueries({ queryKey: ['rewards', 'all', orgId] });
      qc.invalidateQueries({ queryKey: qk.onboardingStatus(orgId) });
      onToast({
        kind: 'success',
        msg: `Added ${rows.length} reward${rows.length === 1 ? '' : 's'} — scroll down to tweak any of them ✦`,
      });
      onClose();
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Could not add rewards' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="starter-rewards-title"
      className="notif-backdrop"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card"
        style={{
          width: 'min(880px, 100%)',
          maxHeight: 'min(86vh, 820px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
          background: 'var(--b-surface)',
        }}
      >
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--b-border-soft)' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h2 id="starter-rewards-title" className="serif" style={{ fontWeight: 600, fontSize: '1.15rem', margin: 0 }}>
                Starter reward ideas
              </h2>
              <p className="muted" style={{ fontSize: 'var(--t-sm)', margin: '4px 0 0', lineHeight: 1.5 }}>
                Browse hand-picked rewards across industry packs. Select what fits and add it next to your existing catalog.
              </p>
            </div>
            <button
              className="icon-btn"
              onClick={onClose}
              aria-label="Close"
              style={{ width: 32, height: 32, flexShrink: 0 }}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
          <div className="row" style={{ gap: 12, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="row" style={{ gap: 8, alignItems: 'center', fontSize: 'var(--t-sm)', color: 'var(--b-ink-2)' }}>
              <span>Industry pack</span>
              <select
                className="input"
                style={{ padding: '6px 10px', fontSize: 'var(--t-sm)', width: 'auto' }}
                value={industry}
                onChange={e => setIndustry(e.target.value as RewardIndustry)}
              >
                {REWARD_INDUSTRIES.map(k => (
                  <option key={k} value={k}>
                    {BRYTE_DATA.INDUSTRIES[k]?.name ?? k}
                    {k === orgIndustry ? ' (yours)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-ghost btn-sm" onClick={toggleAll} disabled={selectable.length === 0}>
              {allSelected ? 'Clear' : 'Select all'}
            </button>
            <div
              aria-live="polite"
              className="muted"
              style={{ fontSize: 'var(--t-xs)', marginLeft: 'auto' }}
            >
              {totalSelected === 0
                ? 'Nothing selected yet'
                : totalSelected === 1
                  ? `1 reward selected · ${pointsMin.toLocaleString()} pts`
                  : `${totalSelected} rewards selected · ${pointsMin.toLocaleString()}–${pointsMax.toLocaleString()} pts`}
            </div>
          </div>
        </div>

        <div style={{ overflowY: 'auto', padding: '16px 24px', flex: 1, display: 'grid', gap: 20 }}>
          {groups.map(g => (
            <div key={g.key}>
              <div className="label" style={{ fontSize: 'var(--t-xs)', marginBottom: 10, color: 'var(--b-ink-3)' }}>
                {g.key}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {g.rows.map(r => {
                  const key = itemKey(r);
                  const isChecked = selected.has(key);
                  return (
                    <label
                      key={key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: 10,
                        padding: 12,
                        border: '1px solid ' + (isChecked ? 'var(--b-forest)' : 'var(--b-border-soft)'),
                        borderRadius: 'var(--r-md)',
                        background: r.duplicate
                          ? 'var(--b-border-soft)'
                          : isChecked
                            ? 'var(--b-forest-pale)'
                            : 'var(--b-surface)',
                        cursor: r.duplicate ? 'not-allowed' : 'pointer',
                        opacity: r.duplicate ? 0.6 : 1,
                        transition: 'background 0.15s ease, border 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        disabled={r.duplicate}
                        checked={isChecked}
                        onChange={() => toggle(key, r.duplicate)}
                        style={{ marginTop: 2 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                          <span
                            aria-hidden="true"
                            style={{
                              width: 10, height: 10, borderRadius: 3,
                              background: r.color, flexShrink: 0,
                            }}
                          />
                          <div style={{
                            fontWeight: 600, fontSize: 'var(--t-sm)', color: 'var(--b-ink)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {r.title}
                          </div>
                        </div>
                        <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 2 }}>
                          {r.brand}{r.denom ? ` · ${r.denom}` : ''}
                        </div>
                        <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          <span className="chip" style={{ padding: '2px 8px', fontSize: 'var(--t-xs)' }}>
                            {r.points.toLocaleString()} pts
                          </span>
                          <span className="chip" style={{ padding: '2px 8px', fontSize: 'var(--t-xs)', textTransform: 'capitalize' }}>
                            {r.kind === 'donate' ? 'donation' : r.kind}
                          </span>
                          {r.fromPack && (
                            <span className="chip" style={{ padding: '2px 8px', fontSize: 'var(--t-xs)' }}>
                              from {r.fromPack}
                            </span>
                          )}
                          {r.duplicate && (
                            <span
                              className="chip"
                              style={{
                                padding: '2px 8px', fontSize: 'var(--t-xs)',
                                background: 'var(--b-gold-pale)', color: 'var(--b-ink-2)',
                              }}
                            >
                              In catalog
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--b-border-soft)',
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            background: 'var(--b-cream-2)',
          }}
        >
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={submit}
            disabled={saving || totalSelected === 0}
          >
            {saving
              ? 'Adding…'
              : totalSelected === 0
                ? 'Add to catalog'
                : `Add ${totalSelected} to catalog`}
          </button>
        </div>
      </div>
    </div>
  );
}

function itemKey(r: RewardSeed): string {
  return rewardDedupKey(r);
}

function groupFor(kind: RewardSeed['kind']): string {
  if (kind === 'gift') return 'Gift cards';
  if (kind === 'experience') return 'Experiences';
  return 'Donations';
}
