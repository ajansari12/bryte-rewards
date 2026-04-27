// Extras2.tsx — Dark mode, Templates library, CSV export, Kudos print view, Mobile parity screens

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { BRYTE_DATA } from '@/lib/data';

const _ini3 = (n: string) => n.split(' ').map((w: string) => w[0]).slice(0, 2).join('');

// ═══════════════════════════════════════════════════════
// DARK MODE TOGGLE
// ═══════════════════════════════════════════════════════
export function DarkModeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} title={dark ? 'Light mode' : 'Dark mode'} style={{
      background: 'var(--b-surface)', border: '1px solid var(--b-border)',
      borderRadius: 'var(--r-md)', padding: 8, cursor: 'pointer',
      color: 'var(--b-ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 200ms var(--ease)',
    }}>
      <Icon name={dark ? 'sun' : 'moon'} size={14}/>
    </button>
  );
}

// Injects dark-mode CSS variables when data-theme="dark"
export function DarkModeStyles() {
  return <style>{`
    [data-theme="dark"] {
      --b-canvas: #14100D;
      --b-surface: #1C1612;
      --b-elevated: #242017;
      --b-card: #1A1511;
      --b-ink: #F5EFE4;
      --b-ink-2: #D9CEBE;
      --b-ink-3: #9E9282;
      --b-ink-4: #6F6558;
      --b-border: #2E261E;
      --b-border-soft: #241D16;
      --b-border-heavy: #3C3226;
      --b-gold: #E4A647;
      --b-gold-light: #F0C679;
      --b-gold-pale: #2B2215;
      --b-gold-border: #463520;
      --b-forest: #6BA886;
      --b-forest-pale: #1A2620;
      --b-forest-border: #2C3F35;
      --b-terra: #E8836A;
      --b-terra-pale: #2B1E19;
    }
    [data-theme="dark"] body { background: var(--b-canvas); color: var(--b-ink); }
    [data-theme="dark"] .modal-backdrop { background: rgba(0,0,0,0.7); }
  `}</style>;
}

// ═══════════════════════════════════════════════════════
// TEMPLATES LIBRARY PANEL (shown inside compose modal)
// ═══════════════════════════════════════════════════════
export function TemplatesLibrary({ onPick, onClose }: { onPick?: (body: string) => void; onClose?: () => void }) {
  const T = BRYTE_DATA.TEMPLATES;
  const cats = [...new Set(T.map((t: any) => t.cat))] as string[];
  const [cat, setCat] = useState(cats[0]);
  const shown = T.filter((t: any) => t.cat === cat);

  return (
    <div style={{background: 'var(--b-surface)', border: '1px solid var(--b-border)', borderRadius: 'var(--r-lg)', padding: 18, marginBottom: 16}}>
      <div className="row" style={{justifyContent: 'space-between', marginBottom: 12}}>
        <div>
          <div className="serif italic" style={{fontSize: 'var(--t-xs)', color: 'var(--b-gold)'}}>Stuck on words?</div>
          <div className="serif" style={{fontSize: '0.95rem', fontWeight: 700, color: 'var(--b-ink)', marginTop: 2}}>Recognition templates</div>
        </div>
        {onClose && <button className="btn-text" style={{fontSize: 'var(--t-xs)'}} onClick={onClose}>Close →</button>}
      </div>
      <div className="row" style={{gap: 6, marginBottom: 12, flexWrap: 'wrap'}}>
        {cats.map((c: string) => (
          <button key={c} onClick={() => setCat(c)} style={{
            padding: '4px 10px', borderRadius: 'var(--r-pill)',
            background: cat === c ? 'var(--b-ink)' : 'var(--b-card)',
            color: cat === c ? 'var(--b-canvas)' : 'var(--b-ink-2)',
            border: '1px solid ' + (cat === c ? 'var(--b-ink)' : 'var(--b-border-soft)'),
            fontSize: 'var(--t-xs)', fontFamily: 'var(--font-ui)', cursor: 'pointer',
          }}>{c}</button>
        ))}
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
        {shown.map((t: any) => (
          <button key={t.title} onClick={() => onPick?.(t.body)} style={{
            textAlign: 'left', padding: '10px 14px', background: 'var(--b-card)',
            border: '1px solid var(--b-border-soft)', borderRadius: 'var(--r-md)',
            cursor: 'pointer', transition: 'all 150ms var(--ease)',
            fontFamily: 'var(--font-ui)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--b-gold-border)'; e.currentTarget.style.background = 'var(--b-gold-pale)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--b-border-soft)'; e.currentTarget.style.background = 'var(--b-card)'; }}>
            <div style={{fontSize: 'var(--t-xs)', fontWeight: 700, color: 'var(--b-ink)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4}}>{t.title}</div>
            <div style={{fontSize: '0.82rem', color: 'var(--b-ink-2)', fontStyle: 'italic', lineHeight: 1.55}}>"{t.body}"</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CSV EXPORT (admin)
// ═══════════════════════════════════════════════════════
export function CsvExportPanel({ onToast }: { onToast?: (toast: { kind: string; msg: string }) => void }) {
  const [scope, setScope] = useState('q1-2026');
  const [incl, setIncl] = useState({ recognitions: true, points: true, redemptions: true, participation: true });

  const toggle = (k: string) => setIncl(s => ({...s, [k]: !s[k as keyof typeof s]}));

  const download = () => {
    const rows = [
      ['Period', scope],
      ['Report generated', new Date().toLocaleString('en-CA')],
      [''],
      ['Recognitions this period', '1,248'],
      ['Points distributed', '126,340'],
      ['Rewards redeemed', '84'],
      ['Participation rate', '82%'],
      [''],
      ['Teammate', 'Given', 'Received', 'Points balance', 'Badges'],
      ['Marcus Chen', 24, 18, 1920, 3],
      ['Priya Deshmukh', 31, 22, 2200, 4],
      ['Sofia Alvarez', 42, 28, 3100, 6],
      ['Devon Park', 19, 35, 2680, 7],
      ['Emma Lindqvist', 11, 14, 920, 2],
      ['Chris Novak', 16, 20, 1440, 3],
      ['Amélie Tremblay', 28, 21, 1560, 4],
    ];
    const csv = rows.map(r => r.map(c => typeof c === 'string' && c.includes(',') ? `"${c}"` : c).join(',')).join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bryte-report-${scope}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast?.({kind: 'success', msg: 'Report downloading ✦'});
  };

  return (
    <div className="card" style={{padding: '22px 24px'}}>
      <div className="h3 mb-4">Export for HR</div>
      <div className="muted" style={{fontSize: 'var(--t-small)', marginBottom: 18, lineHeight: 1.6}}>
        Download a CSV with aggregated data for performance reviews, compensation cycles, or your HRIS.
      </div>

      <div className="form-group">
        <label className="form-label">Period</label>
        <div className="row" style={{gap: 6, flexWrap: 'wrap'}}>
          {[
            {id: 'last-30', label: 'Last 30 days'},
            {id: 'q1-2026', label: 'Q1 2026'},
            {id: 'ytd', label: 'Year to date'},
            {id: 'last-year', label: 'Last year'},
          ].map(p => (
            <button key={p.id} onClick={() => setScope(p.id)} style={{
              padding: '6px 12px', borderRadius: 'var(--r-pill)',
              background: scope === p.id ? 'var(--b-ink)' : 'var(--b-surface)',
              color: scope === p.id ? 'var(--b-canvas)' : 'var(--b-ink-2)',
              border: '1px solid ' + (scope === p.id ? 'var(--b-ink)' : 'var(--b-border)'),
              fontSize: 'var(--t-small)', fontFamily: 'var(--font-ui)', fontWeight: 500, cursor: 'pointer',
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Include</label>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8}}>
          {[
            {id: 'recognitions', label: 'Recognition events'},
            {id: 'points', label: 'Points balances'},
            {id: 'redemptions', label: 'Reward redemptions'},
            {id: 'participation', label: 'Participation metrics'},
          ].map(o => (
            <label key={o.id} className="row" style={{gap: 10, padding: '10px 12px', background: 'var(--b-surface)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 'var(--t-small)', color: 'var(--b-ink-2)'}}>
              <input type="checkbox" checked={incl[o.id as keyof typeof incl]} onChange={() => toggle(o.id)} style={{accentColor: 'var(--b-gold)'}}/>
              {o.label}
            </label>
          ))}
        </div>
      </div>

      <div className="row" style={{gap: 10, marginTop: 10}}>
        <button className="btn btn-primary" onClick={download}>Download CSV →</button>
        <button className="btn btn-ghost">Schedule monthly</button>
      </div>

      <div style={{marginTop: 18, padding: '12px 14px', background: 'var(--b-gold-pale)', border: '1px solid var(--b-gold-border)', borderRadius: 'var(--r-md)', fontSize: 'var(--t-xs)', color: 'var(--b-ink-2)', lineHeight: 1.5}}>
        <span className="serif italic">Privacy note.</span> Recognition *messages* are never included in exports — only counts and metadata. We believe the words people write for each other aren't yours to report on.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// KUDOS BOARD PRINT VIEW
// ═══════════════════════════════════════════════════════
export function KudosPrintView({ onClose }: { onClose?: () => void }) {
  const recs = BRYTE_DATA.INDUSTRIES.healthcare.sampleRecs.slice(0, 6);
  const printNow = () => { window.print(); };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{background: 'rgba(28,20,16,0.85)'}}>
      <div onClick={e => e.stopPropagation()} style={{background: 'var(--b-canvas)', borderRadius: 'var(--r-lg)', width: '100%', maxWidth: 900, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
        <div className="row" style={{justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--b-border-soft)'}}>
          <div>
            <div className="serif italic" style={{fontSize: 'var(--t-xs)', color: 'var(--b-gold)'}}>For the break room</div>
            <div className="serif" style={{fontSize: '1.05rem', fontWeight: 700, color: 'var(--b-ink)'}}>Kudos board — printable</div>
          </div>
          <div className="row" style={{gap: 8}}>
            <button className="btn btn-primary btn-sm" onClick={printNow}>Print / Save PDF</button>
            <button className="close" onClick={onClose}><Icon name="close"/></button>
          </div>
        </div>
        <div style={{overflow: 'auto', flex: 1, padding: 24, background: 'var(--b-ink)'}}>
          <div id="print-sheet" style={{background: '#FAF6EF', padding: '48px 56px', borderRadius: 6, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', margin: '0 auto', maxWidth: 820, aspectRatio: '11 / 8.5', display: 'flex', flexDirection: 'column'}}>
            <div style={{textAlign: 'center', marginBottom: 28, paddingBottom: 18, borderBottom: '2px solid #1F1815'}}>
              <div style={{fontFamily: 'Fraunces', fontStyle: 'italic', fontSize: 16, color: '#C2882D', marginBottom: 4}}>Mapleview Medical · this week</div>
              <div style={{fontFamily: 'Fraunces', fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em', color: '#1F1815', lineHeight: 1, fontVariationSettings: '"opsz" 144'}}>Kudos, team.</div>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, flex: 1}}>
              {recs.map((r: any, i: number) => (
                <div key={i} style={{background: 'white', border: '1px solid #DED4C3', borderRadius: 6, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8}}>
                  <div style={{fontFamily: 'Fraunces', fontStyle: 'italic', fontSize: 11, color: '#C2882D'}}>{r.value}</div>
                  <div style={{fontFamily: 'Fraunces', fontSize: 13, color: '#1F1815', lineHeight: 1.5, fontStyle: 'italic', flex: 1}}>"{r.message.length > 120 ? r.message.slice(0,120) + '…' : r.message}"</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6F6558', borderTop: '1px dashed #DED4C3', paddingTop: 8}}>
                    <span><b style={{color: '#1F1815'}}>{r.sender}</b> → {r.recipient}</span>
                    <span style={{fontFamily: 'ui-monospace, monospace'}}>★</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{textAlign: 'center', marginTop: 20, paddingTop: 14, borderTop: '1px solid #DED4C3', fontSize: 10, color: '#6F6558', fontStyle: 'italic', fontFamily: 'Fraunces'}}>
              From the wall at bryte.ca · Print. Pin. Pass around.
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media print {
          body > *:not(.modal-backdrop) { display: none !important; }
          .modal-backdrop > div > div:first-child { display: none !important; }
          #print-sheet { box-shadow: none !important; margin: 0 !important; max-width: none !important; page-break-after: always; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MOBILE PARITY — Profile / Leaderboard / Rewards screens
// ═══════════════════════════════════════════════════════
export function MobileProfileScreen() {
  const me = BRYTE_DATA.CURRENT_USER;
  return (
    <div style={{padding: 20, paddingBottom: 80}}>
      <div style={{textAlign: 'center', padding: '20px 0 24px'}}>
        <div className={`avatar role-${me.role}`} style={{width: 80, height: 80, fontSize: '1.6rem', margin: '0 auto 12px', boxShadow: '0 0 0 4px var(--b-gold-border)'}}>{me.initials}</div>
        <div className="serif italic" style={{fontSize: '0.8rem', color: 'var(--b-gold)', marginBottom: 2}}>Senior Manager · 2 years</div>
        <div className="serif" style={{fontSize: '1.3rem', fontWeight: 700, color: 'var(--b-ink)', letterSpacing: '-0.02em'}}>Alex Thibodeau</div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20}}>
        {[
          { l: 'Points', v: me.points.toLocaleString(), c: 'var(--b-gold)' },
          { l: 'Badges', v: '6', c: 'var(--b-forest)' },
          { l: 'Streak', v: '12', c: 'var(--b-terra)' },
        ].map(s => (
          <div key={s.l} style={{textAlign: 'center', padding: '14px 10px', background: 'var(--b-surface)', borderRadius: 'var(--r-md)'}}>
            <div className="mono" style={{fontSize: '1.1rem', fontWeight: 700, color: s.c}}>{s.v}</div>
            <div className="label" style={{marginTop: 2, fontSize: 9}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{marginBottom: 16}}>
        <div className="label" style={{marginBottom: 8}}>Your streak · 30 days</div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: 3}}>
          {Array.from({length: 30}).map((_, i) => {
            const given = [0,1,2,4,5,6,8,9,10,11,12,14,15,17,18,19,21,22,23,24,25,27,28,29].includes(i);
            return <div key={i} style={{aspectRatio: '1', borderRadius: 2, background: given ? `rgba(194,136,45,${0.4 + (i%4)*0.15})` : 'var(--b-border-soft)'}}/>;
          })}
        </div>
      </div>
      <div className="label" style={{marginBottom: 8}}>Recent recognition</div>
      {BRYTE_DATA.INDUSTRIES.healthcare.sampleRecs.slice(0, 2).map((r: any, i: number) => (
        <div key={i} style={{padding: '12px 14px', background: 'var(--b-card)', border: '1px solid var(--b-border-soft)', borderRadius: 'var(--r-md)', marginBottom: 8}}>
          <div className="row" style={{gap: 8, marginBottom: 6}}>
            <div className={`avatar sm role-${r.senderRole}`} style={{width: 22, height: 22, fontSize: 9}}>{_ini3(r.sender)}</div>
            <span style={{fontSize: 11}}><b className="serif">{r.sender}</b> <span className="muted">recognised you</span></span>
          </div>
          <p style={{fontStyle: 'italic', fontSize: 12, color: 'var(--b-ink-2)', lineHeight: 1.5, margin: 0}}>"{r.message.slice(0, 90)}…"</p>
        </div>
      ))}
    </div>
  );
}

export function MobileLeaderboardScreen() {
  const L = BRYTE_DATA.LEADERBOARD.slice(0, 8);
  return (
    <div style={{padding: 20, paddingBottom: 80}}>
      <div style={{marginBottom: 16}}>
        <div className="serif italic" style={{fontSize: '0.8rem', color: 'var(--b-gold)'}}>This month</div>
        <div className="serif" style={{fontSize: '1.3rem', fontWeight: 700, color: 'var(--b-ink)', letterSpacing: '-0.02em', marginTop: 2}}>Recognised most</div>
      </div>
      {/* Podium */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, alignItems: 'end', marginBottom: 18}}>
        {[L[1], L[0], L[2]].map((p: any, i: number) => {
          const rank = [2, 1, 3][i];
          const heights = [80, 100, 70];
          return (
            <div key={p.name} style={{textAlign: 'center'}}>
              <div className={`avatar role-${p.role}`} style={{width: 44, height: 44, fontSize: 13, margin: '0 auto 6px', boxShadow: rank === 1 ? '0 0 0 3px var(--b-gold)' : 'none'}}>{_ini3(p.name)}</div>
              <div style={{fontSize: 10, color: 'var(--b-ink)', fontWeight: 600}}>{p.name.split(' ')[0]}</div>
              <div className="mono" style={{fontSize: 10, color: 'var(--b-gold)'}}>{p.points}</div>
              <div style={{height: heights[i], background: rank === 1 ? 'var(--b-gold)' : 'var(--b-border)', marginTop: 6, borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces', fontSize: 20, fontWeight: 700, color: rank === 1 ? '#FAF6EF' : 'var(--b-ink-3)'}}>{rank}</div>
            </div>
          );
        })}
      </div>
      {L.slice(3).map((p: any, i: number) => (
        <div key={p.name} className="row" style={{gap: 10, padding: '10px 12px', background: 'var(--b-card)', border: '1px solid var(--b-border-soft)', borderRadius: 'var(--r-md)', marginBottom: 6}}>
          <span className="mono" style={{fontSize: 11, color: 'var(--b-ink-3)', width: 20}}>{i + 4}</span>
          <div className={`avatar sm role-${p.role}`} style={{width: 26, height: 26, fontSize: 10}}>{_ini3(p.name)}</div>
          <div className="grow">
            <div style={{fontSize: 12, fontWeight: 600, color: 'var(--b-ink)'}}>{p.name}</div>
            <div className="muted" style={{fontSize: 9}}>{p.title}</div>
          </div>
          <span className="mono" style={{fontSize: 11, color: 'var(--b-gold)', fontWeight: 600}}>{p.points}</span>
        </div>
      ))}
    </div>
  );
}

export function MobileRewardsScreen() {
  const R = BRYTE_DATA.REWARDS.slice(0, 6);
  return (
    <div style={{padding: 20, paddingBottom: 80}}>
      <div style={{marginBottom: 16}}>
        <div className="serif italic" style={{fontSize: '0.8rem', color: 'var(--b-gold)'}}>You have</div>
        <div className="mono" style={{fontSize: '1.6rem', fontWeight: 700, color: 'var(--b-ink)'}}>2,450 pts</div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8}}>
        {R.map((r: any) => {
          const canAfford = 2450 >= r.points;
          return (
            <div key={r.title} style={{padding: 12, background: 'var(--b-card)', border: '1px solid var(--b-border-soft)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 6}}>
              <div style={{fontSize: 28, textAlign: 'center'}}>{r.icon}</div>
              <div style={{fontSize: 11, fontWeight: 600, color: 'var(--b-ink)', lineHeight: 1.3}}>{r.title}</div>
              <div className="row" style={{justifyContent: 'space-between', marginTop: 'auto'}}>
                <span className="mono" style={{fontSize: 10, fontWeight: 700, color: canAfford ? 'var(--b-gold)' : 'var(--b-ink-3)'}}>{r.points} pts</span>
                <button className={canAfford ? 'btn btn-primary' : 'btn btn-ghost'} style={{fontSize: 9, padding: '4px 8px', borderRadius: 4}} disabled={!canAfford}>
                  {canAfford ? 'Redeem' : 'Locked'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
