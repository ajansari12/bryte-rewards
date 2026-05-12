// Auth.tsx — split-panel login/signup + 4-step onboarding wizard

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from './Icon';
import { BRYTE_DATA } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { badgesForIndustry } from '@/lib/onboardingPresets';
import { useInviteTeammate } from '@/lib/mutations/useInviteTeammate';

// ─── Auth Pages ──────────────────────────────────────
export function AuthPage({ mode = 'login' }: { mode?: string }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', org: '', name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [lastResendAt, setLastResendAt] = useState(0);

  const resendConfirmation = async () => {
    if (!form.email) return;
    const since = Date.now() - lastResendAt;
    if (since < 30_000) {
      setError(`Please wait ${Math.ceil((30_000 - since) / 1000)}s before resending.`);
      return;
    }
    setError('');
    const type = mode === 'forgot' ? 'recovery' : 'signup';
    if (type === 'recovery') {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resendErr } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo });
      if (resendErr) { setError(resendErr.message); return; }
    } else {
      const { error: resendErr } = await supabase.auth.resend({ type: 'signup', email: form.email });
      if (resendErr) { setError(resendErr.message); return; }
    }
    setLastResendAt(Date.now());
    setInfo(`Confirmation email resent to ${form.email}.`);
  };

  const headlines: Record<string, { h: string; sub: string }> = {
    login: { h: 'Welcome back.', sub: 'Recognise, celebrate, and connect with your team.' },
    signup: { h: "Your team's culture starts here.", sub: 'The recognition platform built for Canadian teams across every industry.' },
    forgot: { h: 'Reset your password.', sub: "We'll email you a secure link to set a new one." },
    reset: { h: 'Choose a new password.', sub: 'Passwords must be at least 8 characters.' },
  };
  const { h, sub } = headlines[mode] || headlines.login;

  const handle = async () => {
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      if (mode === 'forgot') {
        const redirectTo = `${window.location.origin}/reset-password`;
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo });
        if (resetErr) { setError(resetErr.message); return; }
        setInfo('Check your inbox for a password reset link.');
        return;
      }

      if (mode === 'reset') {
        if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        const { error: updErr } = await supabase.auth.updateUser({ password: form.password });
        if (updErr) { setError(updErr.message); return; }
        setInfo('Password updated. Redirecting…');
        setTimeout(() => navigate('/app/feed'), 900);
        return;
      }

      if (mode === 'login') {
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (authErr) { setError(authErr.message); return; }
        // Check if user has completed onboarding (has a users row)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();
          navigate(profile ? '/app/feed' : '/onboarding');
        }
      } else {
        const { data, error: authErr } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { display_name: form.name } },
        });
        if (authErr) { setError(authErr.message); return; }
        if (!data.user) return;

        // If the project has email confirmation enabled, signUp() returns no
        // session. Fall back to an immediate sign-in so the RPC below runs
        // under an authenticated context. If sign-in also fails because the
        // email is not yet confirmed, surface a "check your inbox" state
        // instead of a bare error so the user can resend the confirmation.
        if (!data.session) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
          });
          if (signInErr) {
            setInfo(`Check your inbox at ${form.email} to confirm your account before signing in.`);
            return;
          }
        }

        // Atomically create the org and the caller's admin user profile.
        // Industry is chosen during the OnboardingWizard.
        const { error: rpcErr } = await supabase.rpc('bootstrap_org_and_user', {
          p_org_name: form.org || 'My Organisation',
          p_display_name: form.name || form.email.split('@')[0],
        });
        if (rpcErr) { setError(rpcErr.message); return; }
        navigate('/onboarding');
      }
    } finally {
      setSubmitting(false);
    }
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
              <label className="form-label" htmlFor="auth-name">Full name</label>
              <input id="auth-name" className="input" placeholder="Alex Thibodeau" value={form.name}
                autoComplete="name"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
          )}
          {mode !== 'reset' && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">Work email</label>
              <input id="auth-email" className="input" type="email" placeholder="alex@mapleviewmedical.ca" value={form.email}
                autoComplete="email"
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          )}
          {mode !== 'forgot' && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-password">{mode === 'reset' ? 'New password' : 'Password'}</label>
              <input id="auth-password" className="input" type="password" placeholder="••••••••••" value={form.password}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          )}
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-org">Organisation name</label>
              <input id="auth-org" className="input" placeholder="Mapleview Medical Group" value={form.org}
                autoComplete="organization"
                onChange={e => setForm(f => ({ ...f, org: e.target.value }))} />
            </div>
          )}

          {error && (
            <p style={{ fontSize: 'var(--t-xs)', color: 'var(--b-terra)', marginBottom: 12, lineHeight: 1.5 }}>
              {error}
            </p>
          )}
          {info && (
            <p style={{ fontSize: 'var(--t-xs)', color: 'var(--b-forest)', marginBottom: 12, lineHeight: 1.5 }}>
              {info}
              {(mode === 'signup' || mode === 'forgot') && form.email && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="btn-text"
                    style={{ fontSize: 'inherit' }}
                    onClick={resendConfirmation}
                  >
                    Resend email
                  </button>
                </>
              )}
            </p>
          )}

          <button
            className="btn btn-primary btn-block btn-lg"
            style={{ marginTop: 8 }}
            onClick={handle}
            disabled={
              submitting ||
              (mode === 'forgot' ? !form.email : mode === 'reset' ? !form.password : !form.email || !form.password)
            }
          >
            {submitting
              ? 'One moment…'
              : mode === 'login'
              ? 'Sign in →'
              : mode === 'signup'
              ? 'Create account →'
              : mode === 'forgot'
              ? 'Send reset link →'
              : 'Update password →'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 'var(--t-xs)', color: 'var(--b-ink-3)' }}>
            {mode === 'login' ? (
              <>
                <button className="btn-text" style={{ fontSize: 'inherit' }} onClick={() => navigate('/forgot-password')}>Forgot password?</button>
                <span style={{ margin: '0 8px', color: 'var(--b-ink-4)' }}>·</span>
                Don&apos;t have an account? <button className="btn-text" style={{ fontSize: 'inherit' }} onClick={() => navigate('/signup')}>Sign up →</button>
              </>
            ) : mode === 'signup' ? (
              <>Already have an account? <button className="btn-text" style={{ fontSize: 'inherit' }} onClick={() => navigate('/login')}>Sign in →</button></>
            ) : (
              <button className="btn-text" style={{ fontSize: 'inherit' }} onClick={() => navigate('/login')}>← Back to sign in</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Onboarding Wizard ───────────────────────────────
const ONBOARDING_STEPS = ['Welcome', 'Industry', 'Values', 'Profile', 'Invite'];

const ONBOARDING_SESSION_KEY = 'bryte.onboarding.v1';

function loadOnboardingDraft() {
  try {
    const raw = sessionStorage.getItem(ONBOARDING_SESSION_KEY);
    return raw ? JSON.parse(raw) as { industry?: string; title?: string } : null;
  } catch { return null; }
}

export function OnboardingWizard() {
  const navigate = useNavigate();
  const draft = typeof window !== 'undefined' ? loadOnboardingDraft() : null;
  const [step, setStep] = useState(0);
  const [localIndustry, setLocalIndustry] = useState(draft?.industry || 'healthcare');
  const [values, setValues] = useState<Array<{ id: string; name: string; icon: string; points: number }> | null>(null);
  const [title, setTitle] = useState(draft?.title || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [invites, setInvites] = useState<Array<{ email: string; role: 'employee' | 'manager' }>>([
    { email: '', role: 'employee' },
    { email: '', role: 'employee' },
    { email: '', role: 'employee' },
  ]);
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inviteTeammate = useInviteTeammate();
  const data = BRYTE_DATA.INDUSTRIES;

  useEffect(() => {
    if (localIndustry && data[localIndustry]) {
      setValues(data[localIndustry].values.map((v: { id: string; name: string; icon: string; points: number }) => ({ ...v })));
    }
  }, [localIndustry]);

  useEffect(() => {
    try {
      sessionStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify({ industry: localIndustry, title }));
    } catch {}
  }, [localIndustry, title]);

  const onAvatarPick = (file: File | null) => {
    if (!file) { setAvatarFile(null); setAvatarPreview(null); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Avatar must be under 5MB.'); return; }
    setError('');
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const launch = async () => {
    setLaunching(true);
    setError('');
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) { navigate('/login'); return; }

      // Ensure the caller has a users profile + org. Safe to call repeatedly:
      // the RPC is idempotent and returns the existing org_id if one exists.
      // This recovers users whose first signup attempt failed before the
      // bootstrap RPC was in place.
      const { data: bootstrappedOrgId, error: bootstrapErr } = await supabase.rpc(
        'bootstrap_org_and_user',
        {
          p_org_name: 'My Organisation',
          p_display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || '',
        }
      );
      if (bootstrapErr) throw bootstrapErr;
      const orgId = bootstrappedOrgId as string;

      const { error: orgUpdateErr } = await supabase
        .from('organizations')
        .update({ industry: localIndustry, onboarded_at: new Date().toISOString() })
        .eq('id', orgId);
      if (orgUpdateErr) throw orgUpdateErr;

      // Upload avatar first (if any) so we can save URL with user profile update
      let avatarUrl: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true, cacheControl: '3600' });
        if (uploadErr) throw uploadErr;
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = pub.publicUrl;
      }

      const userUpdate: Record<string, string> = {};
      if (title.trim()) userUpdate.title = title.trim();
      if (avatarUrl) userUpdate.avatar_url = avatarUrl;
      if (Object.keys(userUpdate).length > 0) {
        const { error: userUpdErr } = await supabase.from('users').update(userUpdate).eq('id', user.id);
        if (userUpdErr) throw userUpdErr;
      }

      if (values && values.length > 0) {
        const { error: valuesErr } = await supabase.from('values').insert(
          values.map((v, i) => ({
            org_id: orgId,
            name: v.name,
            icon: v.icon,
            points: v.points,
            sort_order: i + 1,
          }))
        );
        if (valuesErr) throw valuesErr;
      }

      const { error: badgesErr } = await supabase.from('badges').insert(
        badgesForIndustry(localIndustry).map(b => ({ ...b, org_id: orgId }))
      );
      if (badgesErr) throw badgesErr;

      // Send invites (best-effort). Capture failed addresses so the admin
      // knows which teammates still need to be re-invited from the admin UI.
      const pending = invites.filter(i => i.email.trim() && /.+@.+\..+/.test(i.email.trim()));
      const failed: string[] = [];
      if (pending.length > 0) {
        await Promise.all(pending.map(inv =>
          inviteTeammate.mutateAsync({ email: inv.email.trim(), org_id: orgId, role: inv.role })
            .catch(() => { failed.push(inv.email.trim()); })
        ));
      }
      if (failed.length > 0) {
        window.dispatchEvent(new CustomEvent('bryte:toast', {
          detail: { msg: `Could not invite: ${failed.join(', ')}. You can resend from Admin.`, kind: 'warn' },
        }));
      }

      try { sessionStorage.removeItem(ONBOARDING_SESSION_KEY); } catch {}

      setLaunched(true);
      setTimeout(() => { navigate('/app/feed'); }, 1800);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : 'Something went wrong. Please try again.';
      setError(msg);
      setLaunching(false);
    } finally {
      setSaving(false);
    }
  };

  if (launched) return <LaunchScreen />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--b-canvas)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '40px 20px 80px' }}>
      {/* Progress chaptering */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 52 }}>
        {ONBOARDING_STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                role="img"
                aria-label={`Step ${i + 1}: ${s} (${i < step ? 'completed' : i === step ? 'current' : 'upcoming'})`}
                style={{
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
              <div style={{ width: 48, height: 2, background: i < step ? 'var(--b-forest)' : 'var(--b-border-heavy)', margin: '-18px 0 0', transition: 'background 300ms var(--ease)' }} />
            )}
          </div>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 680 }}>
        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div style={{ animation: 'page-in 300ms var(--ease)' }}>
            <div className="serif" style={{ fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 400, color: 'var(--b-gold)', marginBottom: 10, fontVariationSettings: '"opsz" 18' }}>Step 1 of 5</div>
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
            <div className="serif" style={{ fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 400, color: 'var(--b-gold)', marginBottom: 10 }}>Step 2 of 5</div>
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
            <div className="serif" style={{ fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 400, color: 'var(--b-gold)', marginBottom: 10 }}>Step 3 of 5</div>
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

        {/* Step 3 — Admin profile */}
        {step === 3 && (
          <div style={{ animation: 'page-in 300ms var(--ease)' }}>
            <div className="serif" style={{ fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 400, color: 'var(--b-gold)', marginBottom: 10 }}>Step 4 of 5</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 700, color: 'var(--b-ink)', letterSpacing: '-0.03em', marginBottom: 8, fontVariationSettings: '"opsz" 72' }}>
              A little about you
            </h1>
            <p style={{ color: 'var(--b-ink-3)', lineHeight: 1.7, marginBottom: 28 }}>
              Your teammates will see this on recognitions. Both fields are optional.
            </p>

            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 28 }}>
              <div style={{ textAlign: 'center' }}>
                <label htmlFor="avatar-input" style={{ cursor: 'pointer', display: 'inline-block' }}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview"
                      style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--b-border)' }} />
                  ) : (
                    <div style={{
                      width: 96, height: 96, borderRadius: '50%',
                      background: 'var(--b-surface)', border: '2px dashed var(--b-border-heavy)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--b-ink-4)',
                    }}>
                      <Icon name="plus" size={24} />
                    </div>
                  )}
                </label>
                <input id="avatar-input" type="file" accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => onAvatarPick(e.target.files?.[0] ?? null)} />
                <div style={{ fontSize: 'var(--t-xs)', color: 'var(--b-ink-4)', marginTop: 8 }}>Add photo</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="onb-title">Your title</label>
                  <input id="onb-title" className="input" placeholder="Director of People &amp; Culture"
                    value={title} onChange={e => setTitle(e.target.value)} />
                </div>
              </div>
            </div>

            {error && (
              <p style={{ fontSize: 'var(--t-xs)', color: 'var(--b-terra)', marginBottom: 16 }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-primary btn-lg" onClick={() => setStep(4)}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Invite + Launch */}
        {step === 4 && (
          <div style={{ animation: 'page-in 300ms var(--ease)' }}>
            <div className="serif" style={{ fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 400, color: 'var(--b-gold)', marginBottom: 10 }}>Step 5 of 5 · Final step</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 700, color: 'var(--b-ink)', letterSpacing: '-0.03em', marginBottom: 8, fontVariationSettings: '"opsz" 72' }}>
              Invite your first teammates
            </h1>
            <p style={{ color: 'var(--b-ink-3)', lineHeight: 1.7, marginBottom: 24 }}>
              Add a few people now so recognitions start flowing on day one. You can always invite more later.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {invites.map((inv, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 10 }}>
                  <input className="input" type="email" placeholder="teammate@company.com"
                    value={inv.email}
                    onChange={e => setInvites(xs => xs.map((x, ii) => ii === i ? { ...x, email: e.target.value } : x))} />
                  <select className="select"
                    value={inv.role}
                    onChange={e => setInvites(xs => xs.map((x, ii) => ii === i ? { ...x, role: e.target.value as 'employee' | 'manager' } : x))}>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 28 }}
              onClick={() => setInvites(xs => [...xs, { email: '', role: 'employee' }])}>
              <Icon name="plus" size={14} /> Add another
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, maxWidth: 520, marginBottom: 32 }}>
              {[
                { label: 'Values', value: values?.length || 5 },
                { label: 'Badges ready', value: String(badgesForIndustry(localIndustry).length) },
                { label: 'Invites ready', value: String(invites.filter(i => i.email.trim()).length) },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
                  <div className="stat-number">{s.value}</div>
                  <div className="label" style={{ marginTop: 6 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {error && (
              <p style={{ fontSize: 'var(--t-xs)', color: 'var(--b-terra)', marginBottom: 16 }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setStep(3)}>← Back</button>
              <button className="btn btn-celebrate btn-lg" onClick={launch} disabled={launching || saving}
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
