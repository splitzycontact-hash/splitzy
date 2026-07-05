import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { formatEur } from '../utils/formatCurrency'
import { httpMutation } from '../utils/convexHttp'
import { PrivacyFooterLink } from '../components/ui/PrivacyFooterLink'

export function Confirmation() {
  const { state } = useSession()
  const navigate = useNavigate()
  // Montants réellement payés, figés par SET_PAYMENT_DETAILS au moment du
  // paiement — mêmes valeurs que le reçu PDF (generateInvoice.calcAmounts).
  // Ne jamais recalculer via useSessionCalcs ici : le paiement vient
  // d'incrémenter paidCents, donc en parts égales le recalcul re-diviserait
  // le restant et afficherait 1/N de la part réellement payée.
  const subtotal = state.paidSubtotalCents
  const tipAmount = state.paidTipCents
  const total = state.paidTotalCents

  // CRM optionnel — coordonnées laissées par le client pour recevoir les offres
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState(false)
  const [consent, setConsent] = useState(false)

  const validPhone = phone.trim().length >= 4
  const validEmail = /\S+@\S+\.\S+/.test(email.trim())
  const hasAnyValue = validPhone || validEmail
  const canSave = hasAnyValue && consent && !saved

  const saveContact = () => {
    if (!canSave) return
    if (state.convexRestaurantId) {
      httpMutation<string | null>('customers:saveContact', {
        restaurantId: state.convexRestaurantId,
        tableNumber: state.tableNumber,
        firstName: state.userName || undefined,
        avatarIndex: state.userAvatarIndex,
        paymentId: state.lastPaymentId || undefined,
        marketingConsent: true,
        ...(validPhone ? { phone: phone.trim() } : {}),
        ...(validEmail ? { email: email.trim().toLowerCase() } : {}),
      }).catch(() => {})
    }
    setSaved(true)
  }

  // Les articles viennent du state (nom + prix réels de la commande),
  // jamais d'un menu statique : les ids réels sont `order-…` et ne
  // correspondent à aucune liste codée en dur.
  const selectedMenuItems = state.selectedItems

  const totalStr = formatEur(total).replace('€', '')

  return (
    <m.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#FAFAFA' }}
    >
      {/* Dark hero */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: '#0A0A0A', padding: '20px 24px 14px', color: '#fff', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
          background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.022) 0 1px, transparent 1px 14px)',
        }} />
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(232,146,10,0.22) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <m.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.05 }}
            style={{
              width: 46, height: 46, borderRadius: '50%', margin: '0 auto 8px',
              background: '#10B981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 12px 36px -8px rgba(16,185,129,0.55), inset 0 0 0 1px rgba(255,255,255,0.18)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 34 34" fill="none">
              <path d="M6 17L13.5 24L28 9" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </m.div>
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.025em' }}
          >
            Paiement reçu !
          </m.div>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            style={{ fontSize: 12, color: '#A1A1AA', marginTop: 3 }}
          >
            Merci pour cette soirée chez<br />
            <strong style={{ color: '#fff', fontWeight: 600 }}>{state.restaurantName}</strong>
          </m.div>
        </div>
      </div>

      {/* Receipt */}
      <div style={{ padding: '10px 20px 0' }}>
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', padding: '2px 16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 6px', borderBottom: '1px dashed #E4E4E7', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0A0A0A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {state.restaurantName}
              </div>
              <div style={{ fontSize: 11.5, color: '#52525B' }}>
                Table {state.tableNumber} · {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </div>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0A0A0A', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {formatEur(subtotal)}
            </div>
          </div>

          {/* Items (item mode only) */}
          {state.splitMode === 'item' && selectedMenuItems.map(sel => {
            const linePrice = Math.round(sel.priceCents / sel.splitFactor)
            return (
              <div key={sel.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', gap: 8 }}>
                <span style={{ fontSize: 13.5, color: '#52525B', fontWeight: 500 }}>
                  {sel.name}
                  {sel.splitFactor > 1 && <span style={{ fontSize: 11, color: '#A1A1AA', marginLeft: 4 }}>÷{sel.splitFactor}</span>}
                </span>
                <span style={{ fontSize: 13.5, color: '#52525B', fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {formatEur(linePrice)}
                </span>
              </div>
            )
          })}

          {/* Totals */}
          {[
            { l: 'Sous-total', v: formatEur(subtotal), c: '#52525B' },
            ...(tipAmount > 0 ? [{ l: `Pourboire (${state.tipPercent} %)`, v: `+${formatEur(tipAmount)}`, c: '#E8920A' }] : []),
          ].map((row, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 13.5, color: row.c, fontWeight: 500 }}>{row.l}</span>
              </div>
              <span style={{ fontSize: 13.5, color: row.c, fontWeight: row.l.startsWith('Pourboire') ? 700 : 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {row.v}
              </span>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 6px', borderTop: '1px solid #E4E4E7', marginTop: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0A0A0A' }}>Total payé</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {totalStr}€
            </span>
          </div>
        </m.div>

        {/* Receipt actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={async () => {
              const { generateInvoicePDF } = await import('../utils/generateInvoice')
              generateInvoicePDF(state)
            }}
            style={{
              flex: 1, height: 36, borderRadius: 11, border: '1px solid #E4E4E7',
              background: '#fff', color: '#0A0A0A', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v8M7 9L4.5 6.5M7 9L9.5 6.5M2 12h10" stroke="#374151" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Reçu PDF
          </button>
          <button
            type="button"
            style={{
              flex: 1, height: 36, borderRadius: 11, border: '1px solid #E4E4E7',
              background: '#fff', color: '#0A0A0A', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Par e-mail
          </button>
        </div>
      </div>

      {/* CRM optionnel */}
      <div style={{ padding: '8px 20px 0' }}>
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', padding: '8px 12px 8px' }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.005em' }}>
            Recevoir tes prochaines offres ?
          </div>
          <div style={{ fontSize: 11.5, color: '#52525B', marginTop: 2 }}>
            Les bons plans{state.restaurantName ? ` de ${state.restaurantName}` : ''}, sans spam.
          </div>

          {/* Deux champs toujours visibles — téléphone + email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSave) saveContact() }}
              placeholder="06 12 34 56 78"
              style={{
                width: '100%', height: 44, padding: '0 14px', borderRadius: 11,
                border: '1px solid #E4E4E7', background: '#fff', color: '#0A0A0A',
                fontSize: 16, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#E8920A')}
              onBlur={e => (e.currentTarget.style.borderColor = '#E4E4E7')}
            />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSave) saveContact() }}
              placeholder="ton@email.com"
              style={{
                width: '100%', height: 44, padding: '0 14px', borderRadius: 11,
                border: '1px solid #E4E4E7', background: '#fff', color: '#0A0A0A',
                fontSize: 16, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#E8920A')}
              onBlur={e => (e.currentTarget.style.borderColor = '#E4E4E7')}
            />
          </div>

          {/* Consentement unique — apparaît dès qu'un champ contient quelque chose. Jamais pré-coché. */}
          {(phone.trim() !== '' || email.trim() !== '') && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 1, accentColor: '#E8920A', flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 11.5, color: '#52525B', lineHeight: 1.45 }}>
                J'accepte de recevoir les offres de{' '}
                <strong style={{ color: '#0A0A0A', fontWeight: 700 }}>{state.restaurantName || 'ce restaurant'}</strong>.{' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ color: '#E8920A', fontWeight: 600, textDecoration: 'underline' }}
                >
                  Politique de confidentialité
                </a>
              </span>
            </label>
          )}

          {/* Bouton unique Enregistrer → Enregistré ✓ */}
          <button
            type="button"
            onClick={saveContact}
            disabled={!canSave}
            style={{
              width: '100%', height: 44, marginTop: 8, borderRadius: 11, border: 0,
              background: saved ? '#10B981' : canSave ? '#E8920A' : '#E5E7EB',
              color: saved || canSave ? '#fff' : '#9CA3AF',
              fontSize: 14, fontWeight: 700,
              cursor: canSave ? 'pointer' : 'default',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {saved ? (
              <>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Enregistré
              </>
            ) : 'Enregistrer'}
          </button>

          {/* Mention */}
          <div style={{ fontSize: 10.5, color: '#A1A1AA', marginTop: 4, textAlign: 'center' }}>
            Optionnel · Jamais partagé
          </div>
        </m.div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }} />

      {/* Bloc feedback */}
      <div style={{ padding: '6px 20px', paddingBottom: 'max(12px, calc(6px + env(safe-area-inset-bottom)))' }}>
        <m.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate('/feedback')}
          style={{
            width: '100%', height: 56, borderRadius: 16, border: 0,
            background: '#E8920A', color: '#fff',
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer',
            boxShadow: '0 10px 28px -8px rgba(232,146,10,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
            <path d="M9 2L10.9 6.5L16 7.3L12.5 10.7L13.4 15.8L9 13.4L4.6 15.8L5.5 10.7L2 7.3L7.1 6.5L9 2Z" fill="white" />
          </svg>
          Laisser un avis
        </m.button>
        <button
          type="button"
          onClick={() => navigate('/feedback/sent')}
          style={{
            width: '100%', background: 'transparent', border: 0, color: '#52525B',
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: '6px 0 0',
          }}
        >
          Passer
        </button>

        <div style={{ textAlign: 'center', marginTop: 6 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 16, height: 16, borderRadius: 4, background: '#0A0A0A',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 3, gap: 1,
            }}>
              <span style={{ flex: 1, height: '100%', background: '#fff', borderRadius: 1 }} />
              <span style={{ flex: 1, height: '100%', background: '#E8920A', borderRadius: 1 }} />
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#52525B', letterSpacing: '-0.01em' }}>
              Split<span style={{ color: '#E8920A' }}>zy</span>
            </span>
          </span>
        </div>

        <PrivacyFooterLink />
      </div>
    </m.div>
  )
}
