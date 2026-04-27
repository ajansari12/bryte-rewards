// Mobile.tsx — phone frame preview of the feed

import React from 'react';
import { Icon } from './Icon';
import { BRYTE_DATA } from '@/lib/data';
import { IOSDevice } from './IosFrame';

export function MobilePreview({ industry }: { industry: string }) {
  const pack = BRYTE_DATA.INDUSTRIES[industry];
  const recs = pack.sampleRecs.slice(0, 3);
  const initials = (n: string) => n.split(' ').map((w: string) => w[0]).slice(0,2).join('');

  return (
    <IOSDevice width={360} height={720}>
      <div style={{background: 'var(--b-canvas)', minHeight: '100%', paddingBottom: 100}}>
        {/* Topbar */}
        <div style={{
          padding: '50px 20px 12px',
          background: 'var(--b-canvas)',
          borderBottom: '1px solid var(--b-border-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div className="serif" style={{fontSize: 22, fontWeight: 700, color: 'var(--b-ink)', lineHeight: 1}}>
              Bryte<span style={{color: 'var(--b-gold)'}}>.</span>
            </div>
            <div style={{fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--b-ink-3)', textTransform: 'uppercase', marginTop: 2}}>
              {pack.org}
            </div>
          </div>
          <div style={{width: 36, height: 36, borderRadius: 10, background: 'var(--b-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--b-ink-3)'}}>
            <Icon name="bell" size={16}/>
          </div>
        </div>

        {/* Page title */}
        <div style={{padding: '18px 20px 8px'}}>
          <h1 className="page-title" style={{fontSize: '1.6rem'}}>Recognition feed</h1>
          <div className="sub muted" style={{fontSize: 12, marginTop: 2}}>Today · Monday, April 20</div>
        </div>

        {/* Stat strip */}
        <div style={{display: 'flex', gap: 10, padding: '12px 20px 16px', overflowX: 'auto'}}>
          {[
            {label: 'This month', num: '49'},
            {label: 'Participation', num: '92%'},
            {label: 'Points', num: '14.3k'},
          ].map((s, i) => (
            <div key={i} className="stat-card" style={{minWidth: 108, padding: '12px 14px'}}>
              <div className="label" style={{fontSize: 9}}>{s.label}</div>
              <div className="mono" style={{fontSize: '1.15rem', fontWeight: 700, color: 'var(--b-gold)', marginTop: 2}}>{s.num}</div>
            </div>
          ))}
        </div>

        {/* Feed cards */}
        <div style={{padding: '0 16px'}}>
          {recs.map((r: any, i: number) => (
            <article key={i} className={`rec-card ${r.type === 'milestone' ? 'type-milestone' : r.type === 'spotlight' ? 'type-spotlight' : ''}`} style={{marginBottom: 14}}>
              <div className="strip"/>
              <div className="rec-body" style={{padding: '14px 16px'}}>
                <div className="rec-header" style={{marginBottom: 10}}>
                  <div className={`avatar sm role-${r.senderRole || 'employee'}`}>{initials(r.sender)}</div>
                  <div className="rec-names" style={{fontSize: '0.8rem'}}>
                    <span className="rec-sender">{r.sender.split(' ')[0]}</span>{' '}
                    <span className="rec-verb" style={{fontSize: '0.72rem'}}>recognised</span>{' '}
                    <span className="rec-recipient">{r.recipient.split(' ')[0]}</span>
                  </div>
                  <span className="rec-time" style={{fontSize: 10}}>{r.time}</span>
                </div>
                <p className="rec-message" style={{fontSize: '0.82rem', lineHeight: 1.55, margin: '8px 0 10px'}}>
                  "{r.message.length > 140 ? r.message.slice(0, 140) + '…' : r.message}"
                </p>
                <div className="rec-footer-left" style={{gap: 6}}>
                  <span className="value-seal" style={{fontSize: 10}}><span className="star">★</span> {r.value}</span>
                  <span className="dot"/>
                  <span className="points-badge" style={{fontSize: 10}}>+{r.points} pts</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Bottom tab bar */}
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

// Mobile Give Sheet (bottom-sheet)
export function MobileGiveSheet({ industry }: { industry: string }) {
  const pack = BRYTE_DATA.INDUSTRIES[industry];
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
            <div className="avatar sm role-employee">SA</div>
            <div style={{flex: 1}}>
              <div style={{fontWeight: 600, color: 'var(--b-ink)', fontSize: 13}}>Sofia Alvarez</div>
              <div style={{fontSize: 10, color: 'var(--b-ink-3)'}}>Floor Lead</div>
            </div>
          </div>

          <label className="form-label">Value</label>
          <div style={{display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4}}>
            {pack.values.slice(0, 4).map((v: any, i: number) => (
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
            Caught a medication error on the 3pm round — caught it, flagged it, and walked Lily through the protocol again. Exactly the kind of steady judgment that keeps us safe.
          </div>

          <div style={{
            background: 'var(--b-forest-pale)', border: '1px solid var(--b-forest-border)',
            borderRadius: 10, padding: '10px 14px', fontSize: 12, marginTop: 14, marginBottom: 16,
          }}>
            Sofia will receive <span className="mono" style={{fontWeight: 700, color: 'var(--b-forest)'}}>40</span> Bryte Points ✦
          </div>

          <button className="btn btn-celebrate btn-block btn-lg" style={{fontSize: 14}}>
            Send recognition ✦
          </button>
        </div>
      </div>
    </IOSDevice>
  );
}
