// Auth.tsx — split-panel login/signup + 4-step onboarding wizard

import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { BRYTE_DATA } from '@/lib/data';

// ─── Auth Pages ──────────────────────────────────────
export function AuthPage({ mode = 'login', onDone }: { mode?: string; onDone: (dest: string) => void }) {
  const [form, setForm] = useState({ email: '', password: '', org: '', name: '' });
  const [submitting, setSubmitting] = useState(false);

  const headlines: Record<string, { h: string; sub: string }> = {
    login: { h: 'Welcome back.', sub: 'Recognise, celebrate, and connect with your team.' },
    signup: { h: "Your team’s culture starts here.", sub: 'The recognition platform built for Canadian teams across every industry.' },
  };
  const { h, sub } = headlines[mode] || headlines.login;

  const handle = () => {
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); onDone('onboarding'); }, 700);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', minHeight: '100vh' }}>
      {/* Left panel */}
      <div style={{
        background: 'var(--b-surface)',
        borderRight: '1px solid var(--b-border)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: 44,
      }}>
        <div>
          <div className="serif" style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--b-ink)', lineHeight: 1, letterSpacing: '-0.03em', fontVariationSettings: '"opsz" 72' }}>
            Bryte<span style={{ color: 'var(--b-gold)' }}>.</span>
            <span style={{ fontStyle: 'italic', fontWeight: 300, fontSize: '1.6rem', color: 'var(--b-ink-3)', marginLeft: 4 }}>Rewards</span>
          </div>
        </div>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)',
            fontWeight: 600, color: 'var(--b-ink)', lineHeight: 1.2,
            letterSpacing: '-0.02em', fontVariationSettings: '"opsz" 48',
            marginBottom: 18, maxWidth: 340,
          }}>{h}</h2>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', color: 'var(--b-ink-3)', lineHeight: 1.7, maxWidth: 300, marginBottom: 28 }}>
            {sub}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {['Canadian-made', 'CAD pricing always', '12 industry packs'].map(v => (
              <span key={v} className="pill" style={{ fontSize: 11 }}>✦ {v}</span>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 'var(--t-xs)', color: 'var(--b-ink-4)', letterSpacing: '0.06em' }}>
          🍁 Bryte Rewards · Toronto, Canada
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ background: 'var(--b-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h3 className="serif" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--b-ink)', marginBottom: 28, fontVariationSettings: '"opsz" 24' }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </h3>

          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="input" placeholder="Alex Thibodeau" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Work email</label>
            <input className="input" type="email" placeholder="alex@mapleviewmedical.ca" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="input" type="password" placeholder="••••••••••" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Organisation name</label>
              <input className="input" placeholder="Mapleview Medical Group" value={form.org}
                onChange={e => setForm(f => ({ ...f, org: e.target.value }))} />
            </div>
          )}

          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }} onClick={handle} disabled={submitting}>
            {submitting ? 'One moment…' : mode === 'login' ? 'Sign in →' : 'Create account →'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 'var(--t-xs)', color: 'var(--b-ink-3)' }}>
            {mode === 'login' ? (
              <>Don&apos;t have an account? <button className="btn-text" style={{ fontSize: 'inherit' }} onClick={() => onDone('signup')}>Sign up →</button></>
            ) : (
              <>Already have an account? <button className="btn-text" style={{ fontSize: 'inherit' }} onClick={() => onDone('login')}>Sign in →</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Onboarding Wizard ───────────────────────────────
const ONBOARDING_STEPS = ['Welcome', 'Industry', 'Values', 'Launch'];

export function OnboardingWizard({ industry, onSetIndustry, onComplete }: {
  industry: string;
  onSetIndustry: (industry: string) => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [localIndustry, setLocalIndustry] = useState(industry);
  const [values, setValues] = useState<Array<{ id: string; name: string; icon: string; points: number }> | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const data = BRYTE_DATA.INDUSTRIES;

  useEffect(() => {
    if (localIndustry) {
      setValues(data[localIndustry].values.map((v: { id: string; name: string; icon: string; points: number }) => ({ ...v })));
    }
  }, [localIndustry]);

  const launch = () => {
    setLaunching(true);
    setTimeout(() => { setLaunched(true); }, 400);
    setTimeout(() => { onSetIndustry(localIndustry); onComplete(); }, 2200);
  };

  if (launched) return <LaunchScreen />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--b-canvas)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '40px 20px 80px' }}>
      {/* Progress chaptering */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 52 }}>
        {ONBOARDING_STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: i < step ? 'var(--b-forest)' : i === step ? 'var(--b-gold)' : 'var(--b-card)',
                border: `2px solid ${i < step ? 'var(--b-forest)' : i === step ? 'var(--b-gold)' : 'var(--b-border-heavy)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 300ms var(--ease)',
              }}>
                {i < step
                  ? <Icon name="check" size={14} stroke={2.5} style={{ color: 'white' }} />
                  : <span className="serif" style={{ fontSize: '0.9rem', fontWeight: 700, color: i === step ? '#FAF6EF' : 'var(--b-ink-4)', fontVariationSettings: '"opsz" 18' }}>{i + 1}</span>
                }
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: i === step ? 'var(--b-gold)' : 'var(--b-ink-4)' }}>{s}</span>
            </div>
            {i < ONBOARDING_STEPS.length - 1 && (
              <div style={{ width: 64, height: 2, background: i < step ? 'var(--b-forest)' : 'var(--b-border-heavy)', margin: '-18px 0 0', transition: 'background 300ms var(--ease)' }} />
            )}
          </div>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 680 }}>
        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div style={{ animation: 'page-in 300ms var(--ease)' }}>
            <div className="serif" style={{ fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 400, color: 'var(--b-gold)', marginBottom: 10, fontVariationSettings: '"opsz" 18' }}>Step 1 of 4</div>
            <h1 className="page-hero" style={{ marginBottom: 18 }}>Let&apos;s set up<br />your workspace.</h1>
            <p style={{ fontSize: '1rem', color: 'var(--b-ink-3)', lineHeight: 1.7, maxWidth: 440, marginBottom: 36 }}>
              Takes about three minutes. We&apos;ll pick your industry pack, set your values, and you&apos;ll be ready to recognise your team today.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 40 }}>
              {[
                { icon: '🏥', title: 'Industry-tailored', desc: '12 curated packs with values built for your sector' },
                { icon: '✦', title: 'CAD always', desc: 'Real Canadian rewards from brands your team loves' },
                { icon: '🍁', title: 'Made in Canada', desc: 'Built for Canadian teams, Canadian privacy law' },
              ].map(c => (
                <div key={c.title} className="card" style={{ padding: '20px 18px' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{c.icon}</div>
                  <div className="serif" style={{ fontWeight: 600, color: 'var(--b-ink)', marginBottom: 6 }}>{c.title}</div>
                  <div style={{ fontSize: 'var(--t-small)', color: 'var(--b-ink-3)', lineHeight: 1.5 }}>{c.desc}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-lg" onClick={() => setStep(1)}>
              Get started →
            </button>
          </div>
        )}

        {/* Step 1 — Industry selection */}
        {step === 1 && (
          <div style={{ animation: 'page-in 300ms var(--ease)' }}>
            <div className="serif" style={{ fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 400, color: 'var(--b-gold)', marginBottom: 10 }}>Step 2 of 4</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 700, color: 'var(--b-ink)', letterSpacing: '-0.03em', marginBottom: 8, fontVariationSettings: '"opsz" 72' }}>
              What&apos;s your industry?
            </h1>
            <p style={{ color: 'var(--b-ink-3)', lineHeight: 1.7, marginBottom: 32 }}>
              We&apos;ll pre-load values, badges, and copy tailored to your sector.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
              {Object.entries(data).map(([k, v]: [string, any]) => (
                <div key={k}
                  onClick={() => setLocalIndustry(k)}
                  style={{
                    background: localIndustry === k ? 'var(--b-gold-pale)' : 'var(--b-card)',
                    border: `${localIndustry === k ? '2px' : '1.5px'} solid ${localIndustry === k ? 'var(--b-gold)' : 'var(--b-border)'}`,
                    boxShadow: localIndustry === k ? 'var(--shadow-gold)' : 'var(--shadow-xs)',
                    borderRadius: 'var(--r-lg)',
                    padding: '20px 14px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transform: localIndustry === k ? 'translateY(-3px) scale(1.02)' : 'none',
                    transition: 'all 200ms var(--ease)',
                  }}>
                  {localIndustry === k && (
                    <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, color: 'var(--b-gold)', fontWeight: 700 }}>★</div>
                  )}
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{v.icon}</div>
                  <div className="serif" style={{ fontWeight: 600, fontSize: '0.875rem', color: localIndustry === k ? 'var(--b-gold)' : 'var(--b-ink)' }}>{v.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--b-ink-3)', marginTop: 4, lineHeight: 1.4 }}>{v.orgTagline?.split(' · ')[0]}</div>
                </div>
              ))}
            </div>

            {/* Pack preview */}
            {localIndustry && (
              <div style={{ background: 'var(--b-surface)', border: '1px solid var(--b-border)', borderRadius: 'var(--r-lg)', padding: '20px 24px', marginBottom: 28, animation: 'page-in 300ms var(--ease)' }}>
                <div className="h3" style={{ marginBottom: 14 }}>
                  Your <span style={{ color: 'var(--b-gold)' }}>{data[localIndustry].name}</span> pack is ready
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {data[localIndustry].values.map((v: { id: string; name: string; icon: string }) => (
                    <span key={v.id} className="value-seal">{v.icon} {v.name}</span>
                  ))}
                </div>
                <p style={{ fontSize: 'var(--t-small)', color: 'var(--b-ink-3)', fontStyle: 'italic', margin: 0 }}>
                  20+ {data[localIndustry].name.toLowerCase()}-specific badges pre-loaded. Everything is customisable.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
              <button className="btn btn-primary btn-lg" onClick={() => setStep(2)} disabled={!localIndustry}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Values editor */}
        {step === 2 && values && (
          <div style={{ animation: 'page-in 300ms var(--ease)' }}>
            <div className="serif" style={{ fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 400, color: 'var(--b-gold)', marginBottom: 10 }}>Step 3 of 4</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 700, color: 'var(--b-ink)', letterSpacing: '-0.03em', marginBottom: 8, fontVariationSettings: '"opsz" 72' }}>
              Your recognition values
            </h1>
            <p style={{ color: 'var(--b-ink-3)', lineHeight: 1.7, marginBottom: 28 }}>
              These are the behaviours you celebrate. We&apos;ve suggested a set — edit to match your culture.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {values.map((v, i) => (
                <div key={v.id} style={{
                  display: 'grid', gridTemplateColumns: '4px 1fr auto 80px auto',
                  alignItems: 'center', gap: 14,
                  background: 'var(--b-card)', border: '1px solid var(--b-border)',
                  borderRadius: 'var(--r-md)', padding: '14px 16px',
                  boxShadow: 'var(--shadow-xs)',
                }}>
                  <div style={{ height: 36, borderRadius: 2, background: ['var(--b-gold)', 'var(--b-terra)', 'var(--b-forest)', 'var(--b-gold-light)', 'var(--b-ink-3)'][i % 5] }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{v.icon}</span>
                    <input
                      value={v.name}
                      onChange={e => setValues(vs => vs!.map((vv, ii) => ii === i ? { ...vv, name: e.target.value } : vv))}
                      style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--b-ink)', width: '100%', fontFamily: 'var(--font-ui)' }}
                    />
                  </div>
                  <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>pts</span>
                  <select
                    className="select"
                    value={v.points}
                    onChange={e => setValues(vs => vs!.map((vv, ii) => ii === i ? { ...vv, points: +e.target.value } : vv))}
                    style={{ padding: '6px 32px 6px 10px', fontSize: 'var(--t-small)', minWidth: 0 }}>
                    {[10, 20, 30, 40, 50, 75, 100].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button onClick={() => setValues(vs => vs!.filter((_, ii) => ii !== i))} style={{ color: 'var(--b-ink-4)', padding: 4 }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--b-terra)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--b-ink-4)'}>
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 28 }}
              onClick={() => setValues(vs => [...(vs || []), { id: `custom-${Date.now()}`, name: 'New value', icon: '✦', points: 30 }])}>
              <Icon name="plus" size={14} /> Add a value
            </button>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary btn-lg" onClick={() => setStep(3)}>
                Looks good →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Launch */}
        {step === 3 && (
          <div style={{ animation: 'page-in 300ms var(--ease)', textAlign: 'center', paddingTop: 20 }}>
            <div className="serif" style={{ fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 400, color: 'var(--b-gold)', marginBottom: 16 }}>Step 4 of 4 · Final step</div>
            <h1 className="page-hero" style={{ marginBottom: 20, lineHeight: 1 }}>
              Everything&apos;s ready.
            </h1>
            <p style={{ color: 'var(--b-ink-3)', lineHeight: 1.7, maxWidth: 440, margin: '0 auto 36px' }}>
              Your workspace is configured. Values are set. Your team will see their first recognition wall the moment you invite them.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, maxWidth: 520, margin: '0 auto 40px' }}>
              {[
                { label: 'Values', value: values?.length || 5 },
                { label: 'Badges ready', value: '20+' },
                { label: 'Reward brands', value: '12' },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
                  <div className="stat-number">{s.value}</div>
                  <div className="label" style={{ marginTop: 6 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-celebrate btn-lg" onClick={launch} disabled={launching}
                style={{ minWidth: 200, fontSize: '1rem', animation: 'pulse-celebrate 6s ease-in-out infinite' }}>
                {launching ? 'Launching…' : 'Launch Bryte ✦'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LaunchScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--b-canvas)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 999, animation: 'fade-in 300ms var(--ease)',
    }}>
      <h1 className="page-hero" style={{ animation: 'launch-in 600ms var(--ease-spring)' }}>
        You&apos;re live.
      </h1>
      <p className="muted" style={{ marginTop: 12, animation: 'fade-in 400ms 300ms var(--ease) both' }}>
        Opening your team wall…
      </p>
      <style>{`
        @keyframes launch-in {
          0% { opacity: 0; transform: scale(0.7); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
