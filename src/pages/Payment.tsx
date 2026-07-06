import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import { useQuery } from 'convex/react'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { formatEur } from '../utils/formatCurrency'
import { useSessionCalcs } from '../hooks/useSessionCalcs'
import { MOCK_CARDS } from '../data/session'
import { httpMutation, convexErrorCode } from '../utils/convexHttp'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

// Réponse du NOUVEAU contrat payments:create (GOAL_PAIEMENTS_03) : montants
// validés côté serveur — la seule source de SET_PAYMENT_DETAILS.
type CreateResult = {
  paymentId: string
  subtotalCents: number
  tipCents: number
  totalCents: number
  idempotent: boolean
}

export function Payment() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()
  const { subtotal, tipAmount, splitzyFee, total, remainingCents } = useSessionCalcs()
  const [loading, setLoading] = useState<string | null>(null)

  const selectedCard = MOCK_CARDS.find(c => c.id === state.selectedCardId) ?? MOCK_CARDS[0]

  // Message spécial du restaurant (plat du jour…) — bandeau discret en haut.
  // Query non critique : si le WS tarde, le bandeau ne s'affiche simplement pas.
  const specialMessage = useQuery(
    api.restaurants.getSpecialMessage,
    state.convexRestaurantId
      ? { restaurantId: state.convexRestaurantId as Id<'restaurants'> }
      : 'skip',
  )

  const totalStr = formatEur(total).replace('€', '')

  // En mode "par article", liste des noms d'articles à marquer paid dans Convex.
  // Seuls les articles payés à 100% (splitFactor === 1) sont marqués paid —
  // les articles partagés restent visibles pour les autres convives.
  const paidItemNames: string[] | undefined = state.splitMode === 'item'
    ? state.selectedItems.filter(i => i.splitFactor === 1).map(i => i.name)
    : undefined

  // GOAL_PAIEMENTS_05 — clé d'idempotence : générée quand les montants sont
  // figés (arrivée sur cet écran), RÉUTILISÉE pour tout retry réseau du même
  // paiement (anti-doublon), régénérée après un succès ou un rejet
  // STATE_CHANGED (nouvel état = nouveau paiement).
  const idemKeyRef = useRef<string>(crypto.randomUUID())
  const [payError, setPayError] = useState<'state_changed' | 'network' | null>(null)

  // GOAL_PAIEMENTS_05 — fin du fire-and-forget : on ATTEND la réponse de
  // payments:create (nouveau contrat) avant d'afficher la confirmation, et on
  // affiche les montants VALIDÉS par le serveur. Le transport reste
  // httpMutation (fetch keepalive) pour la fiabilité iOS — on attend juste sa
  // réponse. En cas de STATE_CHANGED : bandeau + état à jour, jamais une
  // confirmation avec des montants faux.
  const handlePay = useCallback(async (method: string) => {
    if (loading) return
    setLoading(method)
    setPayError(null)

    // Chemin hors-Convex (démo locale sans table) : comportement historique.
    if (!state.convexRestaurantId || !state.convexTableId) {
      dispatch({ type: 'SET_PAYMENT_DETAILS', payload: {
        method, ref: `SPZ-${Date.now()}-T${state.tableNumber}`, timestamp: Date.now(),
        subtotalCents: subtotal, tipCents: tipAmount, totalCents: total,
      } })
      dispatch({ type: 'CONFIRM_PAYMENT' })
      dispatch({ type: 'ADD_CACHED_PAID_CENTS', payload: subtotal })
      navigate('/confirmation')
      return
    }

    // GOAL_PAIEMENTS_08 — restaurant HORS allowlist NOUVEAU_PAIEMENT_FRACTIONNE :
    // chemin legacy strictement identique à l'ancien client (fire-and-forget,
    // pas d'idempotencyKey → contrat payments:create legacy côté serveur,
    // plafonnement silencieux compris). Aucun changement visible.
    if (!state.newPaymentFlow) {
      httpMutation<string | null>('payments:create', {
        restaurantId: state.convexRestaurantId,
        tableId: state.convexTableId,
        tableNumber: state.tableNumber,
        // Convives : signal fiable uniquement en partage équitable (stepper déclaré).
        // En mode article, undefined — le backend dérive des payeurs distincts.
        guests: state.splitMode === 'equal' ? state.equalSplitCount : undefined,
        subtotalCents: subtotal,
        tipCents: tipAmount,
        commissionCents: splitzyFee,
        totalCents: total,
        paymentMethod: method,
        firstName: state.userName || undefined,
        avatarIndex: state.userAvatarIndex,
        paidItemNames: paidItemNames && paidItemNames.length > 0 ? paidItemNames : undefined,
      })
        // Mémorise l'id du paiement → /confirmation le passe à saveContact pour
        // backfiller phone/email sur CE paiement (regroupement client par contact).
        .then(id => { if (id) dispatch({ type: 'SET_LAST_PAYMENT_ID', payload: id }) })
        .catch(() => {})

      dispatch({ type: 'SET_PAYMENT_DETAILS', payload: {
        method,
        ref: `SPZ-${Date.now()}-T${state.tableNumber}`,
        timestamp: Date.now(),
        subtotalCents: subtotal,
        tipCents: tipAmount,
        totalCents: total,
      } })
      dispatch({ type: 'CONFIRM_PAYMENT' })
      dispatch({ type: 'ADD_CACHED_PAID_CENTS', payload: subtotal })
      if (subtotal >= remainingCents && remainingCents > 0) {
        dispatch({ type: 'MARK_CACHED_ITEMS_PAID' })
      } else if (paidItemNames && paidItemNames.length > 0) {
        dispatch({ type: 'MARK_SPECIFIC_ITEMS_PAID', payload: paidItemNames })
      }
      navigate('/confirmation')
      return
    }

    // Mode par article : allocation explicite (si toutes les unités portent un
    // lineId) + parts réclamées à geler. Les arrondis par article sont les
    // MÊMES que ceux du sous-total (useSessionCalcs) → Σ allocation = subtotal.
    const itemMode = state.splitMode === 'item'
    const allAddressable = itemMode
      && state.selectedItems.length > 0
      && state.selectedItems.every(i => i.lineId)
    const allocation = allAddressable
      ? state.selectedItems.map(i => ({
          lineId: i.lineId as string,
          amountCents: Math.round(i.priceCents / i.splitFactor),
        }))
      : undefined
    const parts = itemMode
      ? state.selectedItems
          .filter(i => i.lineId && i.partId)
          .map(i => ({ lineId: i.lineId as string, partId: i.partId as string }))
      : undefined

    try {
      const r = await httpMutation<CreateResult>('payments:create', {
        restaurantId: state.convexRestaurantId,
        tableId: state.convexTableId,
        tableNumber: state.tableNumber,
        // Convives : signal fiable uniquement en partage équitable (stepper déclaré).
        // En mode article, undefined — le backend dérive des payeurs distincts.
        guests: state.splitMode === 'equal' ? state.equalSplitCount : undefined,
        subtotalCents: subtotal,
        tipCents: tipAmount,
        commissionCents: splitzyFee,
        totalCents: total,
        paymentMethod: method,
        firstName: state.userName || undefined,
        avatarIndex: state.userAvatarIndex,
        paidItemNames: paidItemNames && paidItemNames.length > 0 ? paidItemNames : undefined,
        idempotencyKey: idemKeyRef.current,
        allocation,
        parts: parts && parts.length > 0 ? parts : undefined,
      })

      // Succès : la clé a servi, la suivante concerne un AUTRE paiement.
      idemKeyRef.current = crypto.randomUUID()
      // Mémorise l'id du paiement → /confirmation le passe à saveContact pour
      // backfiller phone/email sur CE paiement (regroupement client par contact).
      dispatch({ type: 'SET_LAST_PAYMENT_ID', payload: r.paymentId })
      dispatch({ type: 'SET_PAYMENT_DETAILS', payload: {
        method,
        ref: `SPZ-${Date.now()}-T${state.tableNumber}`,
        timestamp: Date.now(),
        // Montants SERVEUR — jamais les montants calculés localement.
        subtotalCents: r.subtotalCents,
        tipCents: r.tipCents,
        totalCents: r.totalCents,
      } })
      dispatch({ type: 'CONFIRM_PAYMENT' })
      dispatch({ type: 'ADD_CACHED_PAID_CENTS', payload: r.subtotalCents })
      if (r.subtotalCents >= remainingCents && remainingCents > 0) {
        dispatch({ type: 'MARK_CACHED_ITEMS_PAID' })
      } else if (paidItemNames && paidItemNames.length > 0) {
        dispatch({ type: 'MARK_SPECIFIC_ITEMS_PAID', payload: paidItemNames })
      }
      navigate('/confirmation')
    } catch (err) {
      console.error('[Payment] create', err)
      if (convexErrorCode(err) === 'STATE_CHANGED') {
        // L'état de la table a changé (part prise / déjà payée ailleurs) :
        // on réaffiche l'état à jour — la souscription temps réel recharge les
        // montants — et la prochaine tentative est un NOUVEAU paiement.
        idemKeyRef.current = crypto.randomUUID()
        setPayError('state_changed')
      } else {
        // Erreur réseau : MÊME clé pour le retry — le serveur dédoublonne.
        setPayError('network')
      }
      setLoading(null)
    }
  }, [loading, state, subtotal, tipAmount, splitzyFee, total, dispatch, navigate, remainingCents, paidItemNames])

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
        background: '#0A0A0A', padding: '50px 24px 28px', color: '#fff', flexShrink: 0,
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
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px',
              background: 'rgba(255,255,255,0.08)', border: 0, borderRadius: 10, color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 14, minHeight: 44,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2.5L4.5 7L9 11.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Retour
          </button>
          <div style={{ fontSize: 12, color: '#A1A1AA', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            À régler
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 4, fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline' }}>
            <span>{totalStr}</span>
            <span style={{ color: '#E8920A' }}>€</span>
          </div>
        </div>
      </div>

      {/* GOAL_PAIEMENTS_05 — bandeau d'erreur explicite : jamais de navigation
          vers une confirmation aux montants faux. */}
      {payError && (
        <div style={{
          background: payError === 'state_changed' ? '#FEF2F2' : '#FFF4E5',
          color: payError === 'state_changed' ? '#B91C1C' : '#92400E',
          padding: '12px 20px', flexShrink: 0,
          fontSize: 13, fontWeight: 600, lineHeight: 1.4,
          borderBottom: `1px solid ${payError === 'state_changed' ? 'rgba(239,68,68,0.25)' : '#FDE68A'}`,
        }}>
          {payError === 'state_changed' ? (
            <>
              L'addition a changé (un autre convive a payé ou réservé une part).
              Les montants affichés ont été mis à jour — revérifie ta part avant de payer.
              <button
                type="button"
                onClick={() => navigate('/items')}
                style={{
                  display: 'block', marginTop: 8, padding: '8px 12px', minHeight: 44,
                  border: 0, borderRadius: 10, background: '#B91C1C', color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Revoir les articles
              </button>
            </>
          ) : (
            'Connexion instable — réessaie. Ton paiement ne sera jamais compté deux fois.'
          )}
        </div>
      )}

      {/* Bandeau message spécial du restaurant (plat du jour, info…) */}
      {specialMessage && (
        <div style={{
          background: '#FEF3C7', color: '#92400E',
          padding: '10px 20px', textAlign: 'center', flexShrink: 0,
          fontSize: 13, fontWeight: 600, lineHeight: 1.35,
          borderBottom: '1px solid #FDE68A',
        }}>
          {specialMessage}
        </div>
      )}

      {/* Cards carousel */}
      <div style={{ padding: '20px 0 0' }}>
        <div style={{ padding: '0 20px 10px', fontSize: 11.5, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Mes cartes
        </div>
        <div style={{
          display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px 8px',
          scrollSnapType: 'x mandatory',
        }}>
          {MOCK_CARDS.map(card => {
            const sel = card.id === state.selectedCardId
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => dispatch({ type: 'SET_SELECTED_CARD', payload: card.id })}
                style={{
                  flexShrink: 0, width: 230, height: 130, borderRadius: 16,
                  border: sel ? `2px solid #E8920A` : `2px solid transparent`,
                  background: card.brand === 'Visa'
                    ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)'
                    : 'linear-gradient(135deg, #3B0764 0%, #581C87 100%)',
                  padding: 14, position: 'relative', cursor: 'pointer',
                  color: '#fff', textAlign: 'left',
                  scrollSnapAlign: 'start',
                  boxShadow: sel ? '0 10px 28px -12px rgba(0,0,0,0.4)' : '0 4px 12px -4px rgba(0,0,0,0.2)',
                  transition: 'border-color 0.15s',
                }}
              >
                {sel && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 22, height: 22, borderRadius: '50%', background: '#E8920A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
                <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{card.brand}</div>
                <div style={{ fontSize: 13, fontFamily: 'monospace', marginTop: 22, color: 'rgba(255,255,255,0.85)' }}>
                  •••• •••• •••• <span style={{ color: '#fff', fontWeight: 600 }}>{card.last4}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                  <div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: '0.06em' }}>TITULAIRE</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{card.holder}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: '0.06em' }}>EXP.</div>
                    <div style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{card.expiry}</div>
                  </div>
                </div>
              </button>
            )
          })}
          <button
            type="button"
            style={{
              flexShrink: 0, width: 130, height: 130, borderRadius: 16,
              border: '1.5px dashed #E4E4E7', background: '#fff', color: '#52525B',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
            </div>
            Ajouter
          </button>
        </div>
      </div>

      {/* Digital wallets */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Paiement rapide
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <m.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => handlePay('apple_pay')}
            disabled={!!loading}
            style={{
              flex: 1, height: 50, borderRadius: 12, border: 0, background: '#000', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 17, fontWeight: 500, cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              opacity: loading && loading !== 'apple_pay' ? 0.5 : 1,
            }}
          >
            {loading === 'apple_pay' ? (
              <Spinner />
            ) : (
              <>
                <svg viewBox="0 0 814 1000" width="18" height="18" fill="white" style={{ marginTop: -2 }}>
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-42.3-150.3-109.2c-52.2-77.5-95.2-201.1-95.2-319.1 0-177.9 116.5-272.4 231.2-272.4 60.8 0 112.4 39.8 150.3 39.8 37.8 0 96.5-42.4 165.6-42.4 26.5.1 108.2 2.9 167.9 109.5zm-234.7-181.7c31.5-37.9 54.3-90.8 54.3-143.7 0-7.4-.6-14.8-1.9-20.9-51.7 1.9-112.7 35.4-149.7 77.3-28.3 32.8-55.2 85.8-55.2 139.5 0 8.1 1.3 16.1 1.9 18.7 3.2.6 8.4 1.3 13.6 1.3 46.4 0 103.1-31.9 136.9-72.2z"/>
                </svg>
                Pay
              </>
            )}
          </m.button>
          <m.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => handlePay('google_pay')}
            disabled={!!loading}
            style={{
              flex: 1, height: 50, borderRadius: 12, border: '1px solid #E4E4E7', background: '#fff', color: '#3C4043',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              opacity: loading && loading !== 'google_pay' ? 0.5 : 1,
            }}
          >
            {loading === 'google_pay' ? (
              <Spinner color="#3C4043" />
            ) : (
              <>
                <span style={{ fontWeight: 500 }}>
                  <span style={{ color: '#4285F4' }}>G</span>
                  <span style={{ color: '#EA4335' }}>o</span>
                  <span style={{ color: '#FBBC04' }}>o</span>
                  <span style={{ color: '#4285F4' }}>g</span>
                  <span style={{ color: '#34A853' }}>l</span>
                  <span style={{ color: '#EA4335' }}>e</span>
                </span>
                Pay
              </>
            )}
          </m.button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 16 }} />

      {/* Security + CTA */}
      <div style={{ padding: '12px 20px 8px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#A1A1AA', fontSize: 11 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L1.5 3v4c0 2.5 4.5 4 4.5 4s4.5-1.5 4.5-4V3L6 1z" stroke="#A1A1AA" strokeWidth="1.2" />
          </svg>
          Paiement sécurisé · Stripe · 3D Secure
        </div>
      </div>
      <div style={{ padding: '8px 20px', paddingBottom: 'max(24px, calc(12px + env(safe-area-inset-bottom)))' }}>
        <m.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => handlePay(selectedCard.brand.toLowerCase())}
          disabled={!!loading}
          style={{
            width: '100%', height: 54, borderRadius: 16, border: 0,
            background: '#E8920A', color: '#fff',
            fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 10px 28px -8px rgba(232,146,10,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            opacity: loading && loading !== selectedCard.brand.toLowerCase() ? 0.5 : 1,
          }}
        >
          {loading === selectedCard.brand.toLowerCase() ? (
            <Spinner />
          ) : (
            `Payer avec ${selectedCard.brand} ···· ${selectedCard.last4}`
          )}
        </m.button>
      </div>
    </m.div>
  )
}

function Spinner({ color = '#fff' }: { color?: string }) {
  return (
    <m.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      style={{
        width: 18, height: 18, borderRadius: '50%',
        border: `2px solid ${color}33`, borderTopColor: color,
      }}
    />
  )
}
