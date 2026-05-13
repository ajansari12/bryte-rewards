// Mobile.tsx — phone frame preview of the feed

import { Icon } from './Icon';
import { IOSDevice } from './IosFrame';
import { BrandWordmark } from './BrandWordmark';
import { useRecognitions } from '@/lib/queries/recognitions';
import { useCurrentOrg, useOrgUsers } from '@/lib/queries/users';
import { useOrgValues } from '@/lib/queries/values';
import { useFeedStats } from '@/lib/queries/analytics';

const initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('');

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function MobilePreview() {
  const { data: org } = useCurrentOrg();
  const { data: dbRecs = [] } = useRecognitions();
  const { data: stats } = useFeedStats();
  const recs = dbRecs.slice(0, 3);

  const statStrip = stats ? [
    { label: 'This month', num: String(stats.recognitionsThisMonth) },
    { label: 'Participation', num: `${stats.participationPct}%` },
    { label: 'Points', num: stats.pointsGivenThisMonth >= 1000 ? `${(stats.pointsGivenThisMonth / 1000).toFixed(1)}k` : String(stats.pointsGivenThisMonth) },
  ] : [];

  return (
    <IOSDevice width={360} height={720}>
      <div style={{background: 'var(--b-canvas)', minHeight: '100%', paddingBottom: 100}}>
        <div style={{
          padding: '50px 20px 12px',
          background: 'var(--b-canvas)',
          borderBottom: '1px solid var(--b-border-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <BrandWordmark size="sm" />
            <div style={{fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--b-ink-3)', textTransform: 'uppercase', marginTop: 2}}>
              {org?.name ?? 'Your org'}
            </div>
          </div>
          <div style={{width: 36, height: 36, borderRadius: 10, background: 'var(--b-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--b-ink-3)'}}>
            <Icon name="bell" size={16}/>
          </div>
        </div>

        <div style={{padding: '18px 20px 8px'}}>
          <h1 className="page-title" style={{fontSize: '1.6rem'}}>Recognition feed</h1>
          <div className="sub muted" style={{fontSize: 12, marginTop: 2}}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <div style={{display: 'flex', gap: 10, padding: '12px 20px 16px', overflowX: 'auto'}}>
          {statStrip.map((s, i) => (
            <div key={i} className="stat-card" style={{minWidth: 108, padding: '12px 14px'}}>
              <div className="label" style={{fontSize: 9}}>{s.label}</div>
              <div className="mono" style={{fontSize: '1.15rem', fontWeight: 700, color: 'var(--b-gold)', marginTop: 2}}>{s.num}</div>
            </div>
          ))}
        </div>

        <div style={{padding: '0 16px'}}>
          {recs.length === 0 && (
            <div className="muted" style={{ padding: 40, textAlign: 'center', fontSize: 12 }}>
              No recognitions yet. Be the first.
            </div>
          )}
          {recs.map(r => {
            const sender = (r.sender as any)?.display_name ?? 'Someone';
            const senderRole = (r.sender as any)?.role ?? 'employee';
            const recipient = (r.recipient as any)?.display_name ?? 'a teammate';
            const value = (r.value as any)?.name ?? '';
            return (
              <article key={r.id} className={`rec-card ${r.type === 'milestone' ? 'type-milestone' : r.type === 'spotlight' ? 'type-spotlight' : ''}`} style={{marginBottom: 14}}>
                <div className="strip"/>
                <div className="rec-body" style={{padding: '14px 16px'}}>
                  <div className="rec-header" style={{marginBottom: 10}}>
                    <div className={`avatar sm role-${senderRole}`}>{initials(sender)}</div>
                    <div className="rec-names" style={{fontSize: '0.8rem'}}>
                      <span className="rec-sender">{sender.split(' ')[0]}</span>{' '}
                      <span className="rec-verb" style={{fontSize: '0.72rem'}}>recognised</span>{' '}
                      <span className="rec-recipient">{recipient.split(' ')[0]}</span>
                    </div>
                    <span className="rec-time" style={{fontSize: 10}}>{formatRelTime(r.created_at)}</span>
                  </div>
                  <p className="rec-message" style={{fontSize: '0.82rem', lineHeight: 1.55, margin: '8px 0 10px'}}>
                    "{r.message.length > 140 ? r.message.slice(0, 140) + '…' : r.message}"
                  </p>
                  <div className="rec-footer-left" style={{gap: 6}}>
                    {value && <span className="value-seal" style={{fontSize: 10}}><span className="star">★</span> {value}</span>}
                    <span className="dot"/>
                    <span className="points-badge" style={{fontSize: 10}}>+{r.points} pts</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--b-card)',
        borderTop: '1px solid var(--b-border)',
        paddingBottom: 20,
        paddingTop: 10,
      }}>
        <div style={{display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', paddingBottom: 4}}>
          {[
            {id: 'feed', icon: 'feed', label: 'Feed', active: true},
            {id: 'lb', icon: 'trophy', label: 'Board'},
            {id: 'fab'},
            {id: 'rw', icon: 'gift', label: 'Rewards'},
            {id: 'more', icon: 'users', label: 'Team'},
          ].map((t: any) => {
            if (t.id === 'fab') return (
              <div key="fab" style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'var(--b-terra)',
                boxShadow: '0 6px 20px rgba(208,90,59,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 22, fontWeight: 700, marginTop: -22,
                animation: 'pulse-celebrate 6s ease-in-out infinite',
              }}>✦</div>
            );
            return (
              <div key={t.id} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                color: t.active ? 'var(--b-gold)' : 'var(--b-ink-3)',
                width: 56,
              }}>
                <Icon name={t.icon} size={20}/>
                <span style={{fontSize: 10, fontWeight: t.active ? 600 : 500, letterSpacing: 0.2}}>{t.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </IOSDevice>
  );
}

export function MobileGiveSheet() {
  const { data: values = [] } = useOrgValues();
  const { data: users = [] } = useOrgUsers();
  const firstValue = values[0];
  const sampleRecipient = users[0];
  const recentRec = useRecognitions().data?.[0];
  const message = recentRec?.message ?? 'Write about what they did specifically. What did it make possible?';
  const pointsPreview = firstValue?.points ?? 40;

  return (
    <IOSDevice width={360} height={720}>
      <div style={{background: 'rgba(28,20,16,0.3)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'}}>
        <div style={{
          background: 'var(--b-card)',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '10px 20px 30px',
          maxHeight: '88%',
          overflow: 'auto',
        }}>
          <div style={{width: 42, height: 4, background: 'var(--b-border-heavy)', borderRadius: 3, margin: '4px auto 14px'}}/>
          <h2 className="section-heading" style={{fontSize: '1.25rem'}}>Recognise a teammate</h2>
          <p className="muted" style={{fontSize: 12, marginTop: 4, marginBottom: 18}}>Write it like a note, not a form.</p>

          <label className="form-label">Who</label>
          <div style={{
            background: 'var(--b-gold-pale)', border: '1px solid var(--b-gold-border)',
            borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14
          }}>
            <div className="avatar sm role-employee">{sampleRecipient ? initials(sampleRecipient.display_name) : '—'}</div>
            <div style={{flex: 1}}>
              <div style={{fontWeight: 600, color: 'var(--b-ink)', fontSize: 13}}>{sampleRecipient?.display_name ?? 'A teammate'}</div>
              <div style={{fontSize: 10, color: 'var(--b-ink-3)'}}>{sampleRecipient?.title ?? '—'}</div>
            </div>
          </div>

          <label className="form-label">Value</label>
          <div style={{display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4}}>
            {values.slice(0, 4).map((v, i) => (
              <div key={v.id} style={{
                flexShrink: 0,
                padding: '8px 12px',
                background: i === 0 ? 'var(--b-gold-pale)' : 'var(--b-surface)',
                border: '1px solid ' + (i === 0 ? 'var(--b-gold)' : 'var(--b-border-heavy)'),
                color: i === 0 ? 'var(--b-gold)' : 'var(--b-ink-2)',
                fontWeight: i === 0 ? 600 : 500,
                borderRadius: 10, fontSize: 12,
              }}>
                {v.icon} {v.name}
              </div>
            ))}
          </div>

          <label className="form-label">Message</label>
          <div style={{
            background: 'var(--b-surface)',
            border: '1px solid var(--b-border-heavy)',
            borderLeft: '3px solid var(--b-gold)',
            borderRadius: 10, padding: '12px 14px', minHeight: 110,
            fontSize: 13, fontStyle: 'italic', color: 'var(--b-ink-2)', lineHeight: 1.6,
          }}>
            {message}
          </div>

          <div style={{
            background: 'var(--b-forest-pale)', border: '1px solid var(--b-forest-border)',
            borderRadius: 10, padding: '10px 14px', fontSize: 12, marginTop: 14, marginBottom: 16,
          }}>
            {sampleRecipient?.display_name?.split(' ')[0] ?? 'They'} will receive <span className="mono" style={{fontWeight: 700, color: 'var(--b-forest)'}}>{pointsPreview}</span> Bryte Points ✦
          </div>

          <button className="btn btn-celebrate btn-block btn-lg" style={{fontSize: 14}}>
            Send recognition ✦
          </button>
        </div>
      </div>
    </IOSDevice>
  );
}
