import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { formatEur } from '../utils/formatCurrency'
import { useSessionCalcs } from '../hooks/useSessionCalcs'
import { httpMutation } from '../utils/convexHttp'
import { ItemsLegacy } from './ItemsLegacy'
import { computeLineStatus, type LineHold } from './lineStatus'

type Category = 'entrees' | 'plats' | 'desserts' | 'boissons'

// GOAL_PAIEMENTS_05 — vue par UNITÉ avec son état réel (grand livre) :
// libre / réservée (hold d'un autre convive) / en paiement / payée, et son
// argent (paidCents / prix). Plus de liste filtrée sur un booléen `paid`
// global qui ment. GOAL_PAIEMENTS_10 : la dérivation du libellé/montant à
// l'état de repos vit dans lineStatus.ts (pure, testée E2E).
type UnitView = {
  id: string
  lineId?: string        // absent sur les lignes legacy (non réclamables)
  name: string
  price: number          // prix de l'unité
  remainingCents: number // prix − paidCents (argent encore dû)
  availableCents: number // remaining − capacité tenue par les AUTRES convives
  isPaid: boolean
  restingLabel: string       // libellé hors sélection (lineStatus.ts)
  restingAmountCents: number // montant colonne prix hors sélection
}

const CATEGORY_LABELS: Record<Category, string> = {
  entrees: 'Entrées',
  plats: 'Plats',
  desserts: 'Desserts',
  boissons: 'Boissons',
}

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 4 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 28, height: 4, borderRadius: 2,
          background: i < current ? '#E8920A' : '#E4E4E7',
        }} />
      ))}
    </div>
  )
}

// GOAL_PAIEMENTS_08 — rollout : le nouvel écran (réclamation de parts,
// grisage temps réel) n'est rendu que si le restaurant est dans l'allowlist
// du flag NOUVEAU_PAIEMENT_FRACTIONNE (évalué serveur par getTableContext,
// stocké dans SessionState.newPaymentFlow). Sinon : écran historique
// 3 onglets (ItemsLegacy), strictement inchangé.
export function Items() {
  const { state } = useSession()
  return state.newPaymentFlow ? <ItemsNew /> : <ItemsLegacy />
}

const MODE_LABEL: Record<'item' | 'diviser', string> = {
  item: 'Chacun paie ses plats',
  diviser: "On divise l'addition",
}

function ItemsNew() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()
  const { subtotal, billCents, paidCents, remainingCents, isFullyPaid, liveTable } = useSessionCalcs()
  const [openCat, setOpenCat] = useState<Category | null>('plats')
  // Nom de l'article dont la réclamation vient d'échouer (part prise entre-temps).
  const [claimError, setClaimError] = useState<string | null>(null)
  // Horloge de rendu (grisage des holds expirés) — rafraîchie périodiquement,
  // jamais Date.now() direct dans le rendu (règle de pureté React).
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  // ── GOAL_PAIEMENTS_12 — verrou du mode de paiement par table ──────────────
  // Tout est conditionné par le flag VERROU_MODE_PAIEMENT (allowlist serveur).
  // Hors allowlist : verrou=false → comportement actuel strictement inchangé.
  const verrou = state.verrouModePaiement
  // Mode verrouillé : le live (WS) fait foi dès qu'il a répondu ; avant, le
  // cache posé par TableEntry (HTTP) couvre le premier rendu iOS. Le routing
  // est basé sur cet ÉTAT, jamais sur l'historique du navigateur — le bouton
  // retour ne peut donc pas réafficher un écran de choix périmé.
  const lockedMode: 'item' | 'diviser' | null =
    liveTable !== undefined && liveTable !== null
      ? ((liveTable as { paymentMode?: 'item' | 'diviser' }).paymentMode ?? null)
      : state.cachedPaymentMode
  // Popup de confirmation (mode tapé, pas encore confirmé) + envoi en cours.
  const [pendingMode, setPendingMode] = useState<'item' | 'diviser' | null>(null)
  const [modeBusy, setModeBusy] = useState(false)
  const [modeError, setModeError] = useState(false)
  // Bascule : un AUTRE convive a verrouillé un mode différent — message doux.
  const [switchNotice, setSwitchNotice] = useState<'item' | 'diviser' | null>(null)

  // Cache ← live : garde cachedPaymentMode frais (navigation, RESET_SESSION).
  useEffect(() => {
    if (!verrou || liveTable === undefined || liveTable === null) return
    const live = (liveTable as { paymentMode?: 'item' | 'diviser' }).paymentMode ?? null
    if (live !== state.cachedPaymentMode) {
      dispatch({ type: 'SET_CACHED_PAYMENT_MODE', payload: live })
    }
  }, [verrou, liveTable, state.cachedPaymentMode, dispatch])

  // Mode verrouillé → splitMode forcé dans la famille correspondante.
  useEffect(() => {
    if (!verrou || lockedMode === null) return
    if (lockedMode === 'item' && state.splitMode !== 'item') {
      dispatch({ type: 'SET_SPLIT_MODE', payload: 'item' })
    }
    if (lockedMode === 'diviser' && state.splitMode === 'item') {
      dispatch({ type: 'SET_SPLIT_MODE', payload: 'equal' })
    }
  }, [verrou, lockedMode, state.splitMode, dispatch])

  // Abonnement réactif : le verrou arrive PENDANT que la popup est ouverte
  // (l'autre convive a confirmé avant moi) → fermer la popup sans attendre le
  // retour de la mutation. Si le mode verrouillé diffère de celui que je
  // confirmais, afficher le message de bascule ; sinon (écho WS de mon propre
  // verrou, ou même choix simultané) continuer silencieusement.
  useEffect(() => {
    if (!verrou || lockedMode === null || pendingMode === null) return
    if (lockedMode !== pendingMode) setSwitchNotice(lockedMode)
    setPendingMode(null)
    setModeBusy(false)
  }, [verrou, lockedMode, pendingMode])

  const applyLockedMode = (mode: 'item' | 'diviser') => {
    dispatch({ type: 'SET_CACHED_PAYMENT_MODE', payload: mode })
    dispatch({ type: 'SET_SPLIT_MODE', payload: mode === 'item' ? 'item' : 'equal' })
  }

  // Confirmer → choosePaymentMode (HTTP direct, fiable iOS). Jamais d'erreur
  // brute si un autre convive a gagné la course : message accueillant.
  const confirmPendingMode = () => {
    const mode = pendingMode
    if (!mode || modeBusy || !state.convexTableId) return
    setModeBusy(true)
    setModeError(false)
    httpMutation<{ locked: boolean; mode?: 'item' | 'diviser'; actualMode?: 'item' | 'diviser' }>(
      'tables:choosePaymentMode',
      { tableId: state.convexTableId, mode, clientId: state.clientId },
    )
      .then(r => {
        if (r.locked) {
          applyLockedMode(r.mode ?? mode)
        } else {
          const actual = r.actualMode === 'diviser' ? 'diviser' : 'item'
          applyLockedMode(actual)
          setSwitchNotice(actual)
        }
        setPendingMode(null)
      })
      .catch(err => {
        console.error('[Items] choosePaymentMode', err)
        setModeError(true)
      })
      .finally(() => setModeBusy(false))
  }

  // Spinner seulement si ni Convex ni cache ne sont disponibles.
  // Sur iOS Safari, liveTable peut rester undefined longtemps (WS lent).
  // Dans ce cas on utilise cachedOrderItems (stocké dans SessionContext depuis TableEntry).
  const convexReady = liveTable !== undefined
  const hasCachedItems = state.cachedOrderItems.length > 0

  // Attente initiale : Convex pas encore répondu ET pas de cache
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    if (convexReady || hasCachedItems) return
    const t = setTimeout(() => setTimedOut(true), 20000)
    return () => clearTimeout(t)
  }, [convexReady, hasCachedItems])

  if (!convexReady && !hasCachedItems && !timedOut) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100%', background: '#FAFAFA', gap: 12,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '3px solid #FFF4E5', borderTopColor: '#E8920A',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>Chargement des articles…</div>
      </div>
    )
  }

  // Table entièrement réglée (Convex OU cache) — bloquer tout nouveau paiement.
  // isFullyPaid est vrai dès que cachedPaidCents === billCents, même sans WebSocket.
  if (isFullyPaid) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100%', background: '#FAFAFA', padding: '0 24px', textAlign: 'center', gap: 12,
      }}>
        <div style={{ fontSize: 40 }}>✅</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A' }}>Table entièrement réglée</div>
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>Tous les articles ont été payés.</div>
        <button
          type="button"
          onClick={() => navigate('/welcome')}
          style={{
            marginTop: 8, height: 48, padding: '0 24px', borderRadius: 14, border: 0,
            background: '#E8920A', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Retour
        </button>
      </div>
    )
  }

  // ── GOAL_PAIEMENTS_12 — message de bascule (un autre convive a verrouillé
  // un autre mode). Affiché après une course perdue ou un verrou arrivé
  // pendant la popup. « Continuer » → écran du mode verrouillé.
  if (verrou && switchNotice !== null) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100%', background: '#FAFAFA', padding: '0 24px', textAlign: 'center', gap: 12,
      }}>
        <div style={{ fontSize: 40 }}>🤝</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A' }}>
          Un autre convive vient de choisir «&nbsp;{MODE_LABEL[switchNotice]}&nbsp;» pour toute la table.
        </div>
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>On continue avec ce mode.</div>
        <button
          type="button"
          onClick={() => setSwitchNotice(null)}
          style={{
            marginTop: 8, height: 48, padding: '0 32px', borderRadius: 14, border: 0,
            background: '#E8920A', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Continuer
        </button>
      </div>
    )
  }

  // ── GOAL_PAIEMENTS_12 — écran de choix du mode, AVANT tout contenu par mode.
  // Uniquement : table en paiement + aucun mode verrouillé + restaurant dans
  // l'allowlist. Un convive tardif (mode déjà fixé) ne le voit jamais.
  if (verrou && lockedMode === null && liveTable?.status === 'payment') {
    return (
      <m.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#FAFAFA' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 6px' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              width: 44, height: 44, borderRadius: 12, border: '1px solid #E4E4E7',
              background: '#fff', color: '#0A0A0A', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M9.5 3L5 7.5L9.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.01em' }}>
            Mode de paiement
          </div>
          <div style={{ width: 34 }} />
        </div>
        <div style={{ padding: '0 20px 4px' }}>
          <StepBar current={3} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em' }}>
              Comment souhaitez-vous payer l'addition&nbsp;?
            </div>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>
              Le choix s'applique à toute la table.
            </div>
          </div>
          {([ 'item', 'diviser' ] as const).map(mode => (
            <button
              key={mode}
              type="button"
              disabled={modeBusy}
              onClick={() => { setModeError(false); setPendingMode(mode) }}
              style={{
                minHeight: 76, marginBottom: 12, borderRadius: 18,
                border: '1px solid #E4E4E7', background: '#fff',
                display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px',
                cursor: modeBusy ? 'default' : 'pointer', textAlign: 'left',
                opacity: modeBusy ? 0.6 : 1,
                touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: '#FFF4E5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {mode === 'item' ? '🍽' : '➗'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A' }}>{MODE_LABEL[mode]}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                  {mode === 'item' ? 'Chaque convive sélectionne et règle ses articles.' : 'Parts égales ou montant libre, au choix de chacun.'}
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M6 3.5L10.5 8L6 12.5" stroke="#A1A1AA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>

        {/* Popup de confirmation légère */}
        {pendingMode !== null && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.45)', zIndex: 60,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
            onClick={e => { if (e.target === e.currentTarget && !modeBusy) setPendingMode(null) }}
          >
            <div style={{
              width: '100%', maxWidth: 340, background: '#fff', borderRadius: 20,
              padding: '22px 20px', textAlign: 'center',
              boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', lineHeight: 1.4 }}>
                Toute la table va payer {pendingMode === 'item' ? 'par article' : "en divisant l'addition"}. Confirmer&nbsp;?
              </div>
              {modeError && (
                <div style={{
                  marginTop: 10, fontSize: 12, color: '#B91C1C', fontWeight: 600,
                  background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 10, padding: '8px 10px',
                }}>
                  Connexion instable — réessayez.
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  disabled={modeBusy}
                  onClick={() => setPendingMode(null)}
                  style={{
                    flex: 1, height: 48, borderRadius: 14, border: '1px solid #E4E4E7',
                    background: '#fff', color: '#52525B', fontSize: 14, fontWeight: 700,
                    cursor: modeBusy ? 'default' : 'pointer',
                    touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={modeBusy}
                  onClick={confirmPendingMode}
                  style={{
                    flex: 1, height: 48, borderRadius: 14, border: 0,
                    background: '#E8920A', color: '#fff', fontSize: 14, fontWeight: 700,
                    cursor: modeBusy ? 'default' : 'pointer',
                    opacity: modeBusy ? 0.6 : 1,
                    touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {modeBusy ? 'Confirmation…' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </m.div>
    )
  }

  // Source de vérité : liveTable.orderItems si Convex a répondu, sinon cache SessionContext.
  // Fallback sur le cache aussi si liveTable est défini mais orderItems absent.
  const sourceItems = liveTable?.orderItems ?? state.cachedOrderItems

  // GOAL_PAIEMENTS_05 — toutes les unités, avec leur état (les payées restent
  // visibles, grisées). Les parts que J'AI réclamées (partId dans ma sélection)
  // ne comptent pas comme « tenues par un autre ».
  const myPartIds = new Set(state.selectedItems.map(i => i.partId).filter(Boolean) as string[])
  const units: UnitView[] = sourceItems.flatMap((item, idx) => {
    if (item.lineId) {
      // Unité moderne (qty 1, lineId) — état exact depuis le grand livre,
      // libellé de repos dérivé par lineStatus.ts (GOAL_PAIEMENTS_10).
      const st = computeLineStatus(
        {
          qty: item.qty, unitCents: item.unitCents, paid: item.paid,
          paidCents: item.paidCents, holds: (item as { holds?: LineHold[] }).holds,
        },
        { myPartIds, clientId: state.clientId, nowMs },
      )
      return [{
        id: item.lineId,
        lineId: item.lineId,
        name: item.name,
        price: item.qty * item.unitCents,
        remainingCents: st.remainingCents,
        availableCents: st.availableCents,
        isPaid: st.isPaid,
        restingLabel: st.restingLabel,
        restingAmountCents: st.restingAmountCents,
      }]
    }
    // Ligne legacy sans lineId : éclatement local par qty (comportement
    // historique), sélectionnable mais non réclamable côté serveur.
    return Array.from({ length: item.qty }, (_, qi) => ({
      id: `order-${idx}-${qi}`,
      name: item.name,
      price: item.unitCents,
      remainingCents: item.paid ? 0 : item.unitCents,
      availableCents: item.paid ? 0 : item.unitCents,
      isPaid: item.paid === true,
      restingLabel: item.paid ? 'Payé ✓' : '',
      restingAmountCents: item.unitCents,
    }))
  })

  const hasTableOrder = units.some(u => !u.isPaid)

  if (!hasTableOrder) {
    const allPaid = units.length > 0 && units.every(u => u.isPaid)
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100%', background: '#FAFAFA', padding: '0 24px', textAlign: 'center', gap: 12,
      }}>
        <div style={{ fontSize: 40 }}>{allPaid ? '✅' : '🍽'}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A' }}>
          {allPaid ? 'Table entièrement réglée' : 'Aucun article commandé'}
        </div>
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>
          {allPaid
            ? 'Tous les articles ont été payés.'
            : "Le gérant n'a pas encore enregistré de commande pour cette table."}
        </div>
        <button
          type="button"
          onClick={() => navigate('/welcome')}
          style={{
            marginTop: 8, height: 48, padding: '0 24px', borderRadius: 14, border: 0,
            background: '#E8920A', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Retour
        </button>
      </div>
    )
  }

  const isSelected = (id: string) => state.selectedItems.some(i => i.menuItemId === id)
  const getSplitFactor = (id: string) => state.selectedItems.find(i => i.menuItemId === id)?.splitFactor ?? 1
  const selectedCount = state.selectedItems.length

  // Catégorie unique (les orderItems POS n'ont pas de catégorie).
  const categorized = ([['plats', units]] as [Category, UnitView[]][])
    .map(([cat, items]) => ({ cat, items }))
    .filter(g => g.items.length > 0)

  // GOAL_PAIEMENTS_05 — réclamer = sélectionner (un seul geste). Le tap pose
  // la part via claims:claimPart (HTTP direct, fiable iOS) ; la désélection
  // EST le bouton « libérer ma part » (claims:releasePart). Le grisage des
  // autres convives arrive en temps réel via la souscription tables.getOne.
  // Optimiste : la sélection s'affiche tout de suite, et se retire d'elle-même
  // si le serveur refuse (part plus disponible).
  const handleToggleUnit = (unit: UnitView) => {
    const sel = state.selectedItems.find(i => i.menuItemId === unit.id)
    if (sel) {
      dispatch({ type: 'TOGGLE_ITEM', payload: { itemId: unit.id, priceCents: sel.priceCents, name: unit.name, lineId: unit.lineId } })
      if (sel.partId && sel.lineId && state.convexTableId) {
        httpMutation('claims:releasePart', {
          tableId: state.convexTableId, lineId: sel.lineId, partId: sel.partId,
        }).catch(err => console.error('[Items] releasePart', err))
      }
      return
    }
    if (unit.isPaid || unit.availableCents <= 0) return
    // La base payable = capacité disponible (unité entière si personne d'autre
    // dessus ; la portion libre sinon — le pot d'un hold voisin reste à lui).
    const base = unit.availableCents
    dispatch({ type: 'TOGGLE_ITEM', payload: { itemId: unit.id, priceCents: base, name: unit.name, lineId: unit.lineId } })
    setClaimError(null)
    if (unit.lineId && state.convexTableId) {
      httpMutation<{ partId: string }>('claims:claimPart', {
        tableId: state.convexTableId, lineId: unit.lineId,
        capacityCents: base, claimedBy: state.clientId,
      })
        .then(r => dispatch({ type: 'SET_ITEM_PART', payload: { itemId: unit.id, partId: r.partId } }))
        .catch(err => {
          console.error('[Items] claimPart', err)
          setClaimError(unit.name)
          dispatch({ type: 'TOGGLE_ITEM', payload: { itemId: unit.id, priceCents: base, name: unit.name, lineId: unit.lineId } })
        })
    }
  }

  // Changement de facteur ÷2/÷3/÷4 : réconcilier avec le serveur — relâcher
  // l'ancienne part, réclamer la nouvelle capacité. En cas de refus (la
  // capacité a été prise entre-temps), la sélection se retire proprement.
  const handleFactor = (unit: UnitView, factor: 1 | 2 | 3 | 4) => {
    const sel = state.selectedItems.find(i => i.menuItemId === unit.id)
    if (!sel || sel.splitFactor === factor) return
    dispatch({ type: 'SET_ITEM_SPLIT', payload: { itemId: unit.id, factor } })
    if (sel.lineId && sel.partId && state.convexTableId) {
      const tableId = state.convexTableId
      const cap = Math.max(1, Math.round(sel.priceCents / factor))
      httpMutation('claims:releasePart', { tableId, lineId: sel.lineId, partId: sel.partId })
        .then(() => httpMutation<{ partId: string }>('claims:claimPart', {
          tableId, lineId: sel.lineId, capacityCents: cap, claimedBy: state.clientId,
        }))
        .then(r => dispatch({ type: 'SET_ITEM_PART', payload: { itemId: unit.id, partId: r.partId } }))
        .catch(err => {
          console.error('[Items] réconciliation splitFactor', err)
          setClaimError(unit.name)
          dispatch({ type: 'TOGGLE_ITEM', payload: { itemId: unit.id, priceCents: sel.priceCents, name: unit.name, lineId: sel.lineId } })
        })
    }
  }

  // En mode "parts égales", on divise le RESTANT à payer (et non le total)
  // pour que les paiements multiples sur une même table ne fassent pas
  // re-payer la part déjà encaissée des autres convives.
  const perPerson = remainingCents > 0 && state.equalSplitCount > 0
    ? Math.round(remainingCents / state.equalSplitCount)
    : 0

  return (
    <m.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#FAFAFA' }}
    >
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 6px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            width: 44, height: 44, borderRadius: 12, border: '1px solid #E4E4E7',
            background: '#fff', color: '#0A0A0A', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M9.5 3L5 7.5L9.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.01em' }}>
          Mes articles
        </div>
        <div style={{ width: 34 }} />
      </div>

      {/* Step bar */}
      <div style={{ padding: '0 20px 4px' }}>
        <StepBar current={3} />
      </div>

      {/* Bandeau état paiement live (visible si déjà partiellement réglé) */}
      {paidCents > 0 && (
        <div style={{ padding: '8px 20px 0' }}>
          <div style={{
            background: isFullyPaid ? '#ECFDF5' : '#FFF4E5',
            border: `1px solid ${isFullyPaid ? 'rgba(16,185,129,0.25)' : 'rgba(232,146,10,0.25)'}`,
            borderRadius: 12, padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>{isFullyPaid ? '✓' : '💶'}</span>
            <div style={{ flex: 1, fontSize: 12, color: isFullyPaid ? '#047857' : '#92400E', fontWeight: 600 }}>
              {isFullyPaid
                ? `Table entièrement réglée (${formatEur(paidCents)})`
                : <>Déjà payé : <strong>{formatEur(paidCents)}</strong> · Reste : <strong>{formatEur(remainingCents)}</strong></>}
            </div>
          </div>
        </div>
      )}

      {/* GOAL_PAIEMENTS_12 — mode verrouillé : bandeau à la place du libre choix */}
      {verrou && lockedMode !== null && (
        <div style={{ padding: '8px 20px 0' }}>
          <div style={{
            background: '#FFF4E5', border: '1px solid rgba(232,146,10,0.25)',
            borderRadius: 12, padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <div style={{ flex: 1, fontSize: 12, color: '#92400E', fontWeight: 600 }}>
              Mode de la table : <strong>{MODE_LABEL[lockedMode]}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Mode tabs — masqués si le verrou impose "par article" ; réduits à la
          famille "diviser" (parts égales / montant libre) si ce mode est
          verrouillé ; libres (3 onglets, comportement historique) sinon. */}
      {(!verrou || lockedMode === null || lockedMode === 'diviser') && (
      <div style={{ padding: '8px 20px 0' }}>
        <div style={{ background: '#F1F1F2', borderRadius: 12, padding: 4, display: 'flex' }}>
          {(verrou && lockedMode === 'diviser'
            ? [
                { id: 'equal' as const, label: 'Parts égales' },
                { id: 'custom' as const, label: 'Montant libre' },
              ]
            : [
                { id: 'item' as const, label: 'Par article' },
                { id: 'equal' as const, label: 'Parts égales' },
                { id: 'custom' as const, label: 'Montant libre' },
              ]).map(tab => {
            const active = state.splitMode === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => dispatch({ type: 'SET_SPLIT_MODE', payload: tab.id })}
                style={{
                  flex: 1, padding: '10px 4px', border: 0, borderRadius: 9,
                  background: active ? '#fff' : 'transparent',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  color: active ? '#0A0A0A' : '#52525B',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
      )}

      {/* Mode content */}
      {state.splitMode === 'item' && (
        <div style={{ padding: '14px 20px 0', flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {claimError && (
            <div style={{
              background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 12, padding: '10px 12px', marginBottom: 10,
              fontSize: 12, color: '#B91C1C', fontWeight: 600,
            }}>
              « {claimError} » vient d'être pris par un autre convive — la liste est à jour.
            </div>
          )}
          {categorized.map(({ cat, items }) => {
            const open = openCat === cat
            return (
              <div key={cat} style={{
                background: '#fff', borderRadius: 14, border: '1px solid #E4E4E7',
                marginBottom: 10, overflow: 'hidden',
              }}>
                <button
                  type="button"
                  onClick={() => setOpenCat(open ? null : cat)}
                  style={{
                    width: '100%', padding: '14px 16px', border: 0, background: 'transparent',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A' }}>
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span style={{ fontSize: 11, color: '#52525B', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {items.length} articles
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.18s' }}>
                      <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
                {open && (
                  <div style={{ borderTop: '1px solid #F1F1F2' }}>
                    {items.map((it, idx) => {
                      const sel = isSelected(it.id)
                      const factor = getSplitFactor(it.id)
                      const selItem = state.selectedItems.find(i => i.menuItemId === it.id)
                      const selBase = selItem?.priceCents ?? it.availableCents
                      // États d'unité (grand livre) : payée / réservée (holds
                      // actifs) / partiellement couverte / libre — libellé et
                      // montant de repos dérivés par lineStatus.ts.
                      const blocked = !sel && !it.isPaid && it.availableCents <= 0
                      const disabled = it.isPaid || blocked
                      return (
                        <div key={it.id} style={{
                          borderBottom: idx < items.length - 1 ? '1px solid #F1F1F2' : 'none',
                          opacity: disabled ? 0.45 : 1,
                        }}>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => handleToggleUnit(it)}
                            style={{
                              width: '100%', padding: '12px 16px', border: 0, background: 'transparent',
                              display: 'flex', alignItems: 'center', gap: 12,
                              cursor: disabled ? 'default' : 'pointer',
                            }}
                          >
                            <div style={{
                              width: 22, height: 22, borderRadius: 7,
                              border: `1.5px solid ${sel ? '#E8920A' : '#E4E4E7'}`,
                              background: sel ? '#E8920A' : it.isPaid ? '#E4E4E7' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {(sel || it.isPaid) && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6L5 9L10 3" stroke={it.isPaid && !sel ? '#9CA3AF' : 'white'} strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: '#0A0A0A', textDecoration: it.isPaid ? 'line-through' : 'none' }}>
                                {it.name}
                              </div>
                              <div style={{ fontSize: 11.5, color: it.isPaid ? '#10B981' : blocked ? '#B45309' : sel ? '#E8920A' : '#52525B', marginTop: 1, fontWeight: 600 }}>
                                {sel && !it.isPaid
                                  ? 'Réservé pour toi · désélectionne pour libérer'
                                  : it.restingLabel}
                              </div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: sel ? '#E8920A' : '#0A0A0A', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textDecoration: it.isPaid ? 'line-through' : 'none' }}>
                              {formatEur(it.isPaid ? it.price : sel ? selBase : it.restingAmountCents)}
                            </div>
                          </button>
                          {sel && (
                            <div style={{ padding: '4px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 11.5, color: '#52525B', fontWeight: 600 }}>Partager :</span>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {([1, 2, 3, 4] as const).map(s => {
                                  const isActive = factor === s
                                  return (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => handleFactor(it, s)}
                                      style={{
                                        height: 44, minWidth: 44, padding: '0 10px',
                                        borderRadius: 10,
                                        border: `1.5px solid ${isActive ? '#E8920A' : '#E4E4E7'}`,
                                        background: isActive ? '#FFF4E5' : '#fff',
                                        color: isActive ? '#E8920A' : '#52525B',
                                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                      }}
                                    >
                                      ÷{s}
                                    </button>
                                  )
                                })}
                              </div>
                              <div style={{ flex: 1 }} />
                              <span style={{ fontSize: 12, color: '#E8920A', fontWeight: 700 }}>
                                = {formatEur(Math.round(selBase / factor))}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {state.splitMode === 'equal' && (
        <div style={{ padding: '14px 20px 0', flex: 1 }}>
          <div style={{
            background: '#fff', borderRadius: 18, border: '1px solid #E4E4E7',
            padding: 22, textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#52525B', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {paidCents > 0 ? 'Reste à régler' : 'Total de la table'}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.03em', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
              {billCents > 0 ? formatEur(paidCents > 0 ? remainingCents : billCents) : '—'}
            </div>
            {paidCents > 0 && billCents > 0 && (
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                Addition totale {formatEur(billCents)} · déjà réglé {formatEur(paidCents)}
              </div>
            )}
            <div style={{ marginTop: 24, padding: 16, borderRadius: 14, background: '#FAFAFA' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Nombre de personnes
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_EQUAL_SPLIT_COUNT', payload: Math.max(2, state.equalSplitCount - 1) })}
                  style={{ width: 38, height: 38, borderRadius: 12, border: '1px solid #E4E4E7', background: '#fff', color: '#0A0A0A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
                >
                  −
                </button>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                  {state.equalSplitCount}
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_EQUAL_SPLIT_COUNT', payload: Math.min(12, state.equalSplitCount + 1) })}
                  style={{ width: 38, height: 38, borderRadius: 12, border: '1px solid #E4E4E7', background: '#fff', color: '#0A0A0A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
                >
                  +
                </button>
              </div>
            </div>
            {perPerson > 0 && (
              <div style={{
                marginTop: 12, padding: '14px 16px', borderRadius: 14,
                background: '#FFF4E5', border: '1px solid rgba(232,146,10,0.2)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, color: '#E8920A', fontWeight: 700 }}>Ta part</span>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#E8920A', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                    {formatEur(perPerson)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {state.splitMode === 'custom' && (
        <CustomAmountMode totalCents={remainingCents > 0 ? remainingCents : billCents} />
      )}

      <div style={{ minHeight: 24 }} />

      {/* Sticky footer */}
      <div style={{
        position: 'sticky', bottom: 0,
        background: 'linear-gradient(to top, #FAFAFA 70%, rgba(250,250,250,0))',
        padding: '14px 20px',
        paddingBottom: 'max(24px, calc(12px + env(safe-area-inset-bottom)))',
        flexShrink: 0,
      }}>
        <div style={{
          background: '#fff', border: '1px solid #E4E4E7', borderRadius: 14,
          padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 10,
        }}>
          <div>
            <div style={{ fontSize: 11.5, color: '#52525B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Ma part
            </div>
            <div style={{ fontSize: 11.5, color: '#A1A1AA', marginTop: 1 }}>
              {state.splitMode === 'item' && `${selectedCount} article${selectedCount !== 1 ? 's' : ''}`}
              {state.splitMode === 'equal' && `1 part sur ${state.equalSplitCount}`}
              {state.splitMode === 'custom' && 'Montant libre'}
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {subtotal > 0 ? formatEur(subtotal) : '—'}
          </div>
        </div>
        <m.button
          type="button"
          whileTap={{ scale: 0.985 }}
          disabled={subtotal <= 0}
          onClick={() => navigate('/tip')}
          style={{
            width: '100%', height: 54, borderRadius: 16, border: 0, marginTop: 0,
            background: subtotal > 0 ? '#E8920A' : '#E4E4E7',
            color: subtotal > 0 ? '#fff' : '#A1A1AA',
            fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
            cursor: subtotal > 0 ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: subtotal > 0 ? '0 8px 24px -8px rgba(232,146,10,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)' : 'none',
          }}
        >
          Valider ma part
          {subtotal > 0 && (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M6.75 3.75L11.25 9L6.75 14.25" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </m.button>
      </div>
    </m.div>
  )
}

function CustomAmountMode({ totalCents }: { totalCents: number }) {
  const { state, dispatch } = useSession()
  const [inputVal, setInputVal] = useState(
    state.customAmount > 0 ? (state.customAmount / 100).toString() : ''
  )

  const QUICK_AMOUNTS = [10, 20, 30, 50]

  const handleChange = (val: string) => {
    setInputVal(val)
    const num = parseFloat(val.replace(',', '.'))
    if (!isNaN(num) && num >= 0) {
      dispatch({ type: 'SET_CUSTOM_AMOUNT', payload: Math.round(num * 100) })
    } else {
      dispatch({ type: 'SET_CUSTOM_AMOUNT', payload: 0 })
    }
  }

  const setQuick = (euros: number) => {
    setInputVal(euros.toString())
    dispatch({ type: 'SET_CUSTOM_AMOUNT', payload: euros * 100 })
  }

  return (
    <div style={{ padding: '20px 20px 0', flex: 1 }}>
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E4E4E7', padding: 22 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
          Je paie le montant de mon choix
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', marginTop: 16, gap: 4 }}>
          <input
            type="number"
            inputMode="decimal"
            value={inputVal}
            onChange={e => handleChange(e.target.value)}
            placeholder="0"
            autoFocus
            style={{
              width: 130, fontSize: 48, fontWeight: 800, color: '#0A0A0A',
              letterSpacing: '-0.04em', textAlign: 'right',
              border: 0, outline: 'none', background: 'transparent', fontFamily: 'inherit',
              fontVariantNumeric: 'tabular-nums',
            }}
          />
          <span style={{ fontSize: 32, color: '#E8920A', fontWeight: 800, letterSpacing: '-0.03em' }}>€</span>
        </div>
        {totalCents > 0 && (
          <div style={{ fontSize: 12, color: '#52525B', textAlign: 'center', marginTop: 8 }}>
            Max disponible · {formatEur(totalCents)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {QUICK_AMOUNTS.map(v => {
            const isActive = state.customAmount === v * 100
            return (
              <button
                key={v}
                type="button"
                onClick={() => setQuick(v)}
                style={{
                  flex: 1, height: 38, borderRadius: 10,
                  border: `1px solid ${isActive ? '#E8920A' : '#E4E4E7'}`,
                  background: isActive ? '#FFF4E5' : '#fff',
                  color: isActive ? '#E8920A' : '#0A0A0A',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {v}€
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
