import { useState } from 'react';
import { Icon } from './Icon';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentOrg } from '@/lib/queries/users';
import { useOnboardingStatus } from '@/lib/queries/onboardingStatus';
import { useUpdateOrg, useFinalizeOnboarding } from '@/lib/mutations/useUpdateOrg';
import { badgesForIndustry, starterRewardsForIndustry } from '@/lib/onboardingPresets';
import { BRYTE_DATA } from '@/lib/data';
import { qk } from '@/lib/queries/keys';

type Toast = { kind?: 'success' | 'error' | 'info'; msg: string };
export type AdminTabTarget = 'values' | 'badges' | 'rewards' | 'team';

interface Props {
  onToast: (t: Toast) => void;
  onJumpTab: (t: AdminTabTarget) => void;
  variant?: 'full' | 'compact';
  showFinalize?: boolean;
  showProgress?: boolean;
  heading?: string;
  description?: string;
}

export function OnboardingChecklist({
  onToast,
  onJumpTab,
  variant = 'full',
  showFinalize = true,
  showProgress = true,
  heading,
  description,
}: Props) {
  const { data: org } = useCurrentOrg();
  const { data: status } = useOnboardingStatus();
  const qc = useQueryClient();
  const updateOrg = useUpdateOrg();
  const finalize = useFinalizeOnboarding();
  const [seeding, setSeeding] = useState<null | 'values' | 'badges' | 'rewards'>(null);

  if (!org || !status) {
    return <div className="muted" style={{ fontSize: 'var(--t-sm)' }}>Loading checklist&hellip;</div>;
  }

  const industry = org.industry || 'technology';

  const seedValues = async () => {
    setSeeding('values');
    try {
      const preset = BRYTE_DATA.INDUSTRIES[industry]?.values ?? BRYTE_DATA.INDUSTRIES.technology.values;
      const { error } = await supabase.from('values').insert(
        preset.map((v, i) => ({ org_id: org.id, name: v.name, icon: v.icon, points: v.points, sort_order: i + 1 }))
      );
      if (error) throw error;
      qc.invalidateQueries({ queryKey: qk.orgValues(org.id) });
      qc.invalidateQueries({ queryKey: qk.onboardingStatus(org.id) });
      onToast({ kind: 'success', msg: `Added ${preset.length} starter values ✦` });
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Could not seed values' });
    } finally {
      setSeeding(null);
    }
  };

  const seedBadges = async () => {
    setSeeding('badges');
    try {
      const preset = badgesForIndustry(industry);
      const { error } = await supabase.from('badges').insert(preset.map(b => ({ ...b, org_id: org.id })));
      if (error) throw error;
      qc.invalidateQueries({ queryKey: qk.badges(org.id) });
      qc.invalidateQueries({ queryKey: qk.onboardingStatus(org.id) });
      onToast({ kind: 'success', msg: `Added ${preset.length} starter badges ✦` });
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Could not seed badges' });
    } finally {
      setSeeding(null);
    }
  };

  const seedRewards = async () => {
    setSeeding('rewards');
    try {
      const preset = starterRewardsForIndustry(industry);
      const { error } = await supabase.from('rewards').insert(preset.map(r => ({
        org_id: org.id, title: r.title, brand: r.brand, denom: r.denom,
        points: r.points, color: r.color, kind: r.kind, active: true,
      })));
      if (error) throw error;
      qc.invalidateQueries({ queryKey: qk.rewards(org.id) });
      qc.invalidateQueries({ queryKey: ['rewards', 'all', org.id] });
      qc.invalidateQueries({ queryKey: qk.onboardingStatus(org.id) });
      onToast({ kind: 'success', msg: `Added ${preset.length} starter rewards ✦` });
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Could not seed rewards' });
    } finally {
      setSeeding(null);
    }
  };

  const skipInvites = async () => {
    try {
      await updateOrg.mutateAsync({ org_id: org.id, invites_skipped_at: new Date().toISOString() });
      onToast({ kind: 'info', msg: 'You can invite teammates later from Team.' });
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Could not save' });
    }
  };

  const handleFinalize = async () => {
    try {
      await finalize.mutateAsync(org.id);
      onToast({ kind: 'success', msg: 'Setup complete — your team can now recognise each other ✦' });
    } catch (err) {
      onToast({ kind: 'error', msg: err instanceof Error ? err.message : 'Could not finalize' });
    }
  };

  interface Row {
    key: string;
    label: string;
    done: boolean;
    hint: string;
    seed?: { label: string; run: () => void; busy: boolean };
    jump?: AdminTabTarget;
    skip?: () => void;
  }

  const rows: Row[] = [
    {
      key: 'profile',
      label: 'Organisation profile',
      done: status.hasName && status.hasIndustry,
      hint: status.hasName && status.hasIndustry
        ? `${org.name} · ${BRYTE_DATA.INDUSTRIES[industry]?.name ?? industry}`
        : 'Add your organisation name and industry.',
    },
    {
      key: 'values',
      label: 'Company values',
      done: status.valuesCount > 0,
      hint: status.valuesCount > 0
        ? `${status.valuesCount} value${status.valuesCount === 1 ? '' : 's'} configured.`
        : 'Add the values your team recognises each other for.',
      seed: status.valuesCount === 0
        ? { label: 'Seed recommended', run: seedValues, busy: seeding === 'values' }
        : undefined,
      jump: 'values',
    },
    {
      key: 'badges',
      label: 'Badges',
      done: status.badgesCount > 0,
      hint: status.badgesCount > 0
        ? `${status.badgesCount} badge${status.badgesCount === 1 ? '' : 's'} available.`
        : 'Add achievement badges your team can earn.',
      seed: status.badgesCount === 0
        ? { label: 'Seed recommended', run: seedBadges, busy: seeding === 'badges' }
        : undefined,
      jump: 'badges',
    },
    {
      key: 'rewards',
      label: 'Rewards catalog',
      done: status.rewardsCount > 0,
      hint: status.rewardsCount > 0
        ? `${status.rewardsCount} reward${status.rewardsCount === 1 ? '' : 's'} in the catalog.`
        : 'Add the rewards teammates can redeem points for.',
      seed: status.rewardsCount === 0
        ? { label: 'Seed starter catalog', run: seedRewards, busy: seeding === 'rewards' }
        : undefined,
      jump: 'rewards',
    },
    {
      key: 'team',
      label: 'Invite teammates',
      done: status.memberCount > 1 || status.invitesSkipped,
      hint: status.memberCount > 1
        ? `${status.memberCount} teammates in the workspace.`
        : status.invitesSkipped
          ? 'You chose to invite teammates later.'
          : 'Invite at least one teammate, or skip for now.',
      skip: status.memberCount <= 1 && !status.invitesSkipped ? skipInvites : undefined,
      jump: 'team',
    },
  ];

  const doneCount = rows.filter(r => r.done).length;
  const total = rows.length;
  const readyToFinalize = rows.every(r => r.done);
  const rowPad = variant === 'compact' ? '10px 12px' : '12px 14px';

  return (
    <div style={{ display: 'grid', gap: variant === 'compact' ? 10 : 14 }}>
      {(heading || description) && (
        <div>
          {heading && <h3 className="serif" style={{ fontWeight: 600, marginBottom: 4 }}>{heading}</h3>}
          {description && <p className="muted" style={{ fontSize: 'var(--t-sm)', margin: 0 }}>{description}</p>}
        </div>
      )}

      {showProgress && (
        <div>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6, fontSize: 'var(--t-xs)', color: 'var(--b-ink-3)' }}>
            <span>{doneCount} of {total} complete</span>
            <span>{Math.round((doneCount / total) * 100)}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'var(--b-border-soft)', overflow: 'hidden' }}>
            <div
              role="progressbar"
              aria-valuenow={doneCount}
              aria-valuemin={0}
              aria-valuemax={total}
              style={{
                width: `${(doneCount / total) * 100}%`,
                height: '100%',
                background: readyToFinalize ? 'var(--b-forest)' : 'var(--b-gold)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map(r => (
          <div
            key={r.key}
            className="row"
            style={{
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              padding: rowPad,
              border: '1px solid var(--b-border-soft)',
              borderRadius: 'var(--r-md)',
              background: r.done ? 'var(--b-forest-pale)' : 'var(--b-surface)',
              opacity: r.done ? 0.78 : 1,
              transition: 'background 0.2s ease',
            }}
          >
            <div className="row" style={{ gap: 12, alignItems: 'center', minWidth: 0 }}>
              <span aria-hidden="true" style={{
                width: 22, height: 22, borderRadius: '50%',
                background: r.done ? 'var(--b-forest)' : 'var(--b-border-heavy)',
                color: r.done ? 'white' : 'var(--b-ink-3)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                {r.done
                  ? <Icon name="check" size={12} stroke={3} />
                  : <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--b-ink-4)' }} />}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontWeight: 600, color: 'var(--b-ink)',
                  fontSize: 'var(--t-sm)',
                  textDecoration: r.done ? 'line-through' : 'none',
                }}>
                  {r.label}
                </div>
                <div className="muted" style={{ fontSize: 'var(--t-xs)', lineHeight: 1.4 }}>{r.hint}</div>
              </div>
            </div>
            {!r.done && (
              <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                {r.seed && (
                  <button className="btn btn-ghost btn-sm" onClick={r.seed.run} disabled={r.seed.busy}>
                    {r.seed.busy ? 'Seeding…' : r.seed.label}
                  </button>
                )}
                {r.skip && (
                  <button className="btn btn-ghost btn-sm" onClick={r.skip}>Skip</button>
                )}
                {r.jump && (
                  <button className="btn btn-primary btn-sm" onClick={() => onJumpTab(r.jump!)}>
                    Go <Icon name="arrow" size={11} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showFinalize && (
        <div className="row" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
          <button
            className="btn btn-celebrate"
            onClick={handleFinalize}
            disabled={!readyToFinalize || finalize.isPending || !!status.onboardedAt}
          >
            {status.onboardedAt
              ? 'Setup complete ✦'
              : finalize.isPending
                ? 'Finalising…'
                : readyToFinalize
                  ? 'Mark onboarding complete ✦'
                  : 'Finish every step to go live'}
          </button>
          {!readyToFinalize && !status.onboardedAt && (
            <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>
              {total - doneCount} step{total - doneCount === 1 ? '' : 's'} remaining.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
