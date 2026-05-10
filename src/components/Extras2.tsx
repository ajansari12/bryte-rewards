// Extras2.tsx — Dark mode styles + Kudos print view

import { Icon } from './Icon';
import { BRYTE_DATA } from '@/lib/data';

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

// Kudos board print view — printable 11x8.5 sheet of recent recognitions
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
