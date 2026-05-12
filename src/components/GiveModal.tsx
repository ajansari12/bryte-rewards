import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { useCurrentUser } from '@/lib/queries/users';
import { useOrgValues } from '@/lib/queries/values';
import { useOrgUsers } from '@/lib/queries/users';
import { useGiveRecognition } from '@/lib/mutations/useGiveRecognition';
import { useQuarterlySpend, useQuarterlyPool } from '@/lib/queries/budget';
import { useFocusTrap } from './Extras';

interface Person {
  id: string;
  name: string;
  title: string;
  role: string;
}

interface GiveRecognitionModalProps {
  onClose: () => void;
  onDone?: () => void;
  presetRecipientId?: string | null;
}

export function GiveRecognitionModal({ onClose, onDone, presetRecipientId }: GiveRecognitionModalProps) {
  const { data: currentUser } = useCurrentUser();
  const { data: orgUsers = [] } = useOrgUsers();
  const { data: orgValues = [] } = useOrgValues();
  const giveRecognition = useGiveRecognition();
  const { data: quarterSpent = 0 } = useQuarterlySpend();
  const quarterlyPool = useQuarterlyPool();
  const poolRemaining = Math.max(0, quarterlyPool - quarterSpent);

  const people: Person[] = orgUsers
    .filter(u => u.id !== currentUser?.id)
    .map(u => ({ id: u.id, name: u.display_name, title: u.title, role: u.role }));

  const values = orgValues.length > 0
    ? orgValues
    : [{ id: 'default', name: 'Excellence', icon: '✦', points: 30, org_id: '', sort_order: 0 }];

  const [recipient, setRecipient] = useState<Person | null>(null);

  useEffect(() => {
    if (!presetRecipientId || recipient) return;
    const p = people.find(x => x.id === presetRecipientId);
    if (p) setRecipient(p);
  }, [presetRecipientId, people, recipient]);
  const [search, setSearch] = useState('');
  const [value, setValue] = useState(values[0]);
  const [message, setMessage] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [phase, setPhase] = useState<'idle' | 'sending' | 'flying' | 'sent'>('idle');
  const [showTpl, setShowTpl] = useState(false);

  const trapRef = useFocusTrap(phase === 'idle', onClose);

  const initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('');
  const filtered = people.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const canSend = recipient && value && message.length > 10;

  // Ensure value stays in sync if orgValues load after initial render
  const activeValue = orgValues.find(v => v.id === value?.id) ?? value;

  const handleSubmit = async () => {
    if (!canSend || phase !== 'idle' || !currentUser) return;
    setPhase('sending');
    setTimeout(() => setPhase('flying'), 180);

    try {
      await giveRecognition.mutateAsync({
        org_id: currentUser.org_id,
        sender_id: currentUser.id,
        recipient_id: recipient!.id,
        value_id: activeValue?.id && !activeValue.id.startsWith('default') ? activeValue.id : null,
        message,
        points: activeValue?.points ?? 30,
        type: isPublic ? 'public' : 'private',
        _senderName: currentUser.display_name,
        _senderRole: currentUser.role,
        _recipientName: recipient!.name,
        _valueName: activeValue?.name ?? null,
        _valueIcon: activeValue?.icon ?? null,
      });
    } catch {
      setPhase('idle');
      return;
    }

    setTimeout(() => {
      onDone?.();
      onClose();
    }, 850);
  };

  const senderName = currentUser?.display_name ?? 'You';

  return (
    <>
      {/* Flying card overlay */}
      {phase === 'flying' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 240, background: 'var(--b-card)', borderRadius: 'var(--r-lg)', border: '1px solid var(--b-border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'card-fly 800ms var(--ease-spring) forwards' }}>
            <div style={{ height: 4, background: 'var(--b-terra)' }} />
            <div style={{ padding: '14px 16px' }}>
              <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                <div className="avatar sm role-manager">{initials(senderName)}</div>
                <div style={{ fontSize: '0.8rem' }}>
                  <span className="serif" style={{ fontWeight: 600, color: 'var(--b-ink)' }}>{senderName}</span>{' '}
                  <span className="italic muted" style={{ fontSize: '0.72rem' }}>recognised</span>{' '}
                  <span className="serif" style={{ fontWeight: 600, color: 'var(--b-gold)' }}>{recipient?.name}</span>
                </div>
              </div>
              <p style={{ fontSize: '0.78rem', fontStyle: 'italic', color: 'var(--b-ink-2)', lineHeight: 1.5, borderLeft: '2px solid var(--b-gold-border)', paddingLeft: 10, margin: '0 0 10px' }}>
                &ldquo;{message.slice(0, 80)}{message.length > 80 ? '…' : ''}&rdquo;
              </p>
              <span className="value-seal" style={{ fontSize: '0.65rem' }}>
                <span className="star">★</span> {activeValue?.name}
              </span>
            </div>
          </div>
          <style>{`@keyframes card-fly { 0%{opacity:0;transform:scale(0.75) translateY(30px)} 25%{opacity:1;transform:scale(1) translateY(0)} 75%{opacity:1;transform:scale(0.8) translate(-340px,-230px)} 100%{opacity:0;transform:scale(0.5) translate(-420px,-310px)} }`}</style>
        </div>
      )}

      <div className="modal-backdrop" onClick={phase === 'idle' ? onClose : undefined}
        style={{ opacity: phase === 'flying' ? 0.3 : 1, transition: 'opacity 300ms var(--ease)', pointerEvents: phase === 'flying' ? 'none' : 'auto' }}>
        <div ref={trapRef} className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="give-modal-title">
          <div className="modal-head">
            <h2 id="give-modal-title" className="section-heading">Recognise a teammate</h2>
            <p className="sub muted" style={{ marginTop: 6, fontSize: 'var(--t-small)' }}>This will appear on the team wall and notify them.</p>
            <button className="close" aria-label="Close" onClick={onClose}><Icon name="close" size={16} /></button>
          </div>

          <div className="modal-body">
            {/* Recipient */}
            <div className="form-group">
              <label className="form-label" htmlFor="give-recipient-search">Who are you recognising?</label>
              {recipient ? (
                <div className="row" style={{ background: 'var(--b-gold-pale)', border: '1px solid var(--b-gold-border)', borderRadius: 'var(--r-md)', padding: '8px 12px', gap: 10 }}>
                  <div className={`avatar sm role-${recipient.role}`} aria-hidden="true">{initials(recipient.name)}</div>
                  <div className="grow">
                    <div style={{ fontWeight: 600, color: 'var(--b-ink)', fontSize: '0.875rem' }}>{recipient.name}</div>
                    <div style={{ fontSize: 'var(--t-xs)', color: 'var(--b-ink-3)' }}>{recipient.title}</div>
                  </div>
                  <button className="icon-btn" aria-label="Remove recipient" onClick={() => setRecipient(null)}><Icon name="close" size={14} /></button>
                </div>
              ) : (
                <>
                  <input id="give-recipient-search" className="input" placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} autoFocus aria-autocomplete="list" aria-expanded={search.length > 0} role="combobox" aria-controls="give-recipient-listbox" />
                  {search && (
                    <div id="give-recipient-listbox" role="listbox" aria-label="Teammates" style={{ marginTop: 6, maxHeight: 180, overflowY: 'auto', border: '1px solid var(--b-border)', borderRadius: 'var(--r-md)', background: 'var(--b-card)' }}>
                      {filtered.slice(0, 6).map(p => (
                        <div key={p.id} role="option" aria-selected={false} tabIndex={0}
                          onClick={() => { setRecipient(p); setSearch(''); }}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setRecipient(p); setSearch(''); } }}
                          style={{ display: 'flex', gap: 10, padding: '8px 12px', cursor: 'pointer', alignItems: 'center', transition: 'background 80ms var(--ease)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--b-elevated)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <div className={`avatar sm role-${p.role}`} aria-hidden="true">{initials(p.name)}</div>
                          <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--b-ink)', fontWeight: 500 }}>{p.name}</div>
                            <div style={{ fontSize: 'var(--t-xs)', color: 'var(--b-ink-3)' }}>{p.title}</div>
                          </div>
                        </div>
                      ))}
                      {filtered.length === 0 && (
                        <div role="option" aria-selected={false} style={{ padding: '12px 16px', color: 'var(--b-ink-3)', fontSize: 'var(--t-sm)' }}>No teammates found</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Value */}
            <div className="form-group">
              <label className="form-label">What are you celebrating?</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {values.map(v => (
                  <button key={v.id} className="tweak-chip"
                    style={{
                      background: activeValue?.id === v.id ? 'var(--b-gold-pale)' : 'var(--b-surface)',
                      borderColor: activeValue?.id === v.id ? 'var(--b-gold)' : 'var(--b-border-heavy)',
                      color: activeValue?.id === v.id ? 'var(--b-gold)' : 'var(--b-ink-2)',
                      fontWeight: activeValue?.id === v.id ? 600 : 500,
                    }}
                    onClick={() => setValue(v)}>
                    <span>{v.icon}</span> {v.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="form-group">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="form-label" htmlFor="give-message" style={{ margin: 0 }}>What did they do?</label>
                <button type="button" className="btn-text" style={{ fontSize: 'var(--t-xs)' }} onClick={() => setShowTpl(v => !v)}>
                  {showTpl ? '× Hide templates' : '☷ Use a template'}
                </button>
              </div>
              {showTpl && (
                <div style={{ marginBottom: 10, padding: 10, background: 'var(--b-surface)', border: '1px solid var(--b-border-soft)', borderRadius: 'var(--r-md)', display: 'grid', gap: 6 }}>
                  {[
                    { label: 'Customer save', body: 'Stayed late to turn a frustrated customer into a fan. Specifically —' },
                    { label: 'Peer assist', body: 'Jumped in without being asked to help unblock the team on —' },
                    { label: 'Quiet excellence', body: 'Did the careful, unglamorous work that made this week hold together, including —' },
                    { label: 'Safety first', body: 'Spotted and addressed a safety concern before it became an incident —' },
                  ].map(t => (
                    <button key={t.label} type="button" className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                      onClick={() => { setMessage(t.body); setShowTpl(false); }}>
                      <span style={{ fontWeight: 600, color: 'var(--b-forest)', marginRight: 8 }}>{t.label}</span>
                      <span style={{ color: 'var(--b-ink-3)', fontSize: 'var(--t-xs)' }}>{t.body.slice(0, 60)}…</span>
                    </button>
                  ))}
                </div>
              )}
              <textarea id="give-message" className="textarea quoted"
                placeholder="Describe what happened. Be specific — this is what makes recognition meaningful."
                value={message} onChange={e => setMessage(e.target.value)} maxLength={500} />
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
                <span style={{ fontSize: 'var(--t-xs)', color: message.length > 420 ? 'var(--b-gold)' : 'var(--b-ink-4)' }}>
                  {message.length}/500
                </span>
              </div>
            </div>

            {/* Live preview */}
            {recipient && message.length > 10 && (
              <div style={{ marginBottom: 16, animation: 'page-in 250ms var(--ease)' }}>
                <label className="form-label" style={{ color: 'var(--b-ink-4)' }}>Preview</label>
                <div style={{ background: 'var(--b-surface)', borderRadius: 'var(--r-md)', padding: '14px 16px', border: '1px solid var(--b-border-soft)' }}>
                  <div style={{ fontSize: '0.85rem', lineHeight: 1.4, marginBottom: 6 }}>
                    <span className="serif" style={{ fontWeight: 600, color: 'var(--b-ink)' }}>{senderName}</span>{' '}
                    <span className="italic muted" style={{ fontSize: '0.8rem' }}>recognised</span>{' '}
                    <span className="serif" style={{ fontWeight: 600, color: 'var(--b-gold)' }}>{recipient.name}</span>
                  </div>
                  <p style={{ fontStyle: 'italic', color: 'var(--b-ink-2)', fontSize: '0.85rem', lineHeight: 1.55, borderLeft: '2px solid var(--b-gold-border)', paddingLeft: 10, margin: '8px 0' }}>
                    &ldquo;{message}&rdquo;
                  </p>
                  <span className="value-seal" style={{ fontSize: '0.65rem' }}>
                    <span className="star">★</span> {activeValue?.name}
                  </span>
                </div>
              </div>
            )}

            {/* Points */}
            <div role="status" aria-live="polite" style={{ padding: '10px 14px', background: 'var(--b-forest-pale)', borderRadius: 'var(--r-md)', border: '1px solid var(--b-forest-border)', marginBottom: 14, fontSize: 'var(--t-small)', color: 'var(--b-ink-2)' }}>
              <div>
                {recipient ? recipient.name.split(' ')[0] : 'They'} will receive{' '}
                <span className="mono" style={{ fontWeight: 700, color: 'var(--b-forest)' }}>{activeValue?.points ?? 0}</span>{' '}
                Bryte Points ✦
              </div>
              <div className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 4 }}>
                Quarter pool remaining:{' '}
                <span className="mono" style={{ fontWeight: 600, color: 'var(--b-ink-2)' }}>
                  {poolRemaining.toLocaleString()}
                </span>{' '}
                / {quarterlyPool.toLocaleString()}
              </div>
            </div>

            {/* Toggle */}
            <div className="row" style={{ justifyContent: 'space-between', padding: '10px 0 16px' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--b-ink)', fontWeight: 500 }}>Post to team wall</div>
                <div style={{ fontSize: 'var(--t-xs)', color: 'var(--b-ink-3)' }}>{isPublic ? 'Everyone sees it' : 'Only recipient and admins see it'}</div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                <span className="track" /><span className="thumb" />
              </label>
            </div>

            {/* Send button */}
            <button className="btn btn-celebrate btn-block btn-lg"
              disabled={!canSend || phase !== 'idle'}
              style={{ opacity: !canSend || phase !== 'idle' ? 0.55 : 1, animation: canSend && phase === 'idle' ? 'pulse-celebrate 6s ease-in-out infinite' : 'none', transition: 'opacity 200ms var(--ease)' }}
              onClick={handleSubmit}>
              {phase === 'sending' || phase === 'flying' ? (
                <><Icon name="check" size={16} stroke={3} /> Sent ✦</>
              ) : <>Send recognition ✦</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
