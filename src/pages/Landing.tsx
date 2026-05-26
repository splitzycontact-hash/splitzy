import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import { useQuery } from 'convex/react'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { formatEur } from '../utils/formatCurrency'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function Landing() {
  const { state } = useSession()
  const navigate = useNavigate()

  // iOS Safari suspend le WS quand l'app est en arrière-plan. À la reprise,
  // Convex reconnecte automatiquement mais peut prendre 1-2s. Ce compteur
  // force un re-rendu immédiat au retour au premier plan pour réévaluer
  // l'état des useQuery dès que le WS est rétabli.
  const [, setVisibilityTick] = useState(0)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') setVisibilityTick(t => t + 1)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Abonnement live à la table : reflète paidCents / amountCents en temps réel.
  // Fallback sur l'état contextuel (set par TableEntry) tant que Convex charge.
  const liveTable = useQuery(
    api.tables.getOne,
    state.convexTableId ? { tableId: state.convexTableId as Id<'tables'> } : 'skip',
  )

  // Timeout : si Convex ne répond pas en 4s (WS lent iOS), on cache le
  // spinner et affiche la page sans bandeau plutôt que bloquer.
  const [tableTimedOut, setTableTimedOut] = useState(false)
  useEffect(() => {
    if (liveTable !== undefined) return
    const t = setTimeout(() => setTableTimedOut(true), 4000)
    return () => clearTimeout(t)
  }, [liveTable])

  const tableLoading = liveTable === undefined && !!state.convexTableId && !tableTimedOut
  const billCents = liveTable?.amountCents ?? state.tableTotalCents
  const paidCents = liveTable?.paidCents ?? 0
  const remainingCents = Math.max(0, billCents - paidCents)
  const hasPaidSomething = paidCents > 0
  const isFullyPaid = billCents > 0 && remainingCents === 0

  const tableLabel = state.tableNumber
    ? `Table ${state.tableNumber}${state.restaurantName ? ` · ${state.restaurantName}` : ''}`
    : 'Splitzy'

  return (
    <m.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#F4F4F5' }}
    >
      {/* Dark hero */}
      <div style={{
        background: '#18181B',
        padding: '52px 24px 32px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Decorative card deco */}
        <div style={{
          position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', gap: 7, opacity: 0.16, pointerEvents: 'none',
        }}>
          <div style={{ width: 30, height: 48, borderRadius: 6, padding: '8px 5px', display: 'flex', flexDirection: 'column', gap: 5, background: '#ffffff' }}>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.18)' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.18)', width: '60%' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.18)' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.18)', width: '80%' }} />
          </div>
          <div style={{ width: 30, height: 48, borderRadius: 6, padding: '8px 5px', display: 'flex', flexDirection: 'column', gap: 5, background: '#E8920A' }}>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.22)' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.22)', width: '60%' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.22)' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.22)', width: '80%' }} />
          </div>
        </div>

        {/* Pill */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 24, padding: '8px 18px',
            color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600,
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{
              width: 7, height: 7, background: '#E8920A', borderRadius: '50%',
              boxShadow: '0 0 6px rgba(232,146,10,0.8)',
              animation: 'landingPillBlink 2s infinite',
            }} />
            {tableLabel}
          </span>
          <style>{`@keyframes landingPillBlink { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>
        </div>

        {/* Logo */}
        <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', marginBottom: 6 }}>
          Split<span style={{ color: '#E8920A' }}>zy</span>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em' }}>
          Payez. Partez. Sans friction.
        </div>
      </div>

      {/* White sheet */}
      <div style={{
        background: '#fff',
        borderRadius: '32px 32px 0 0',
        marginTop: -24,
        padding: '28px 24px 0',
        boxShadow: '0 -6px 40px rgba(0,0,0,0.12)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Sheet handle */}
        <div style={{ width: 32, height: 4, background: '#E0E0E4', borderRadius: 4, margin: '0 auto 24px' }} />

        {/* Restaurant card */}
        <div style={{
          background: 'linear-gradient(to right, #fffbf2 0%, #fff 60%)',
          borderRadius: 20, padding: 16,
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14,
          border: '1px solid rgba(232,146,10,0.2)',
          borderLeft: '4px solid #E8920A',
          boxShadow: '0 2px 16px rgba(232,146,10,0.1)',
        }}>
          <div style={{
            width: 50, height: 50, flexShrink: 0,
            background: 'linear-gradient(135deg, #E8920A, #B45309)',
            borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, boxShadow: '0 4px 14px rgba(232,146,10,0.32)',
          }}>
            🍽
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
              {state.restaurantName || 'Le restaurant'}
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              {state.tableNumber ? `Table ${state.tableNumber}` : 'Table'}
              {state.tableCapacity > 0 ? ` · ${state.tableCapacity} couverts` : ''}
              {' · Session ouverte'}
            </div>
            {billCents > 0 && (
              <div style={{ fontSize: 12, color: '#E8920A', fontWeight: 700, marginTop: 2 }}>
                Addition : {formatEur(billCents)}
              </div>
            )}
          </div>
        </div>

        {/* Bandeau état de paiement — loading pendant reconnexion WS iOS */}
        {tableLoading && (
          <div style={{
            background: '#F4F4F5', border: '1px solid #E5E7EB',
            borderRadius: 16, padding: '12px 14px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
              border: '2px solid #E5E7EB', borderTopColor: '#E8920A',
              animation: 'landingSpinBanner 0.8s linear infinite',
            }} />
            <style>{`@keyframes landingSpinBanner { to { transform: rotate(360deg) } }`}</style>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>Vérification état de la table…</div>
          </div>
        )}
        {/* Bandeau état de paiement live — affiché dès qu'au moins un paiement
            partiel ou total a été enregistré sur la sitting courante. */}
        {!tableLoading && hasPaidSomething && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: isFullyPaid ? '#ECFDF5' : '#FFF4E5',
              border: `1px solid ${isFullyPaid ? 'rgba(16,185,129,0.25)' : 'rgba(232,146,10,0.25)'}`,
              borderRadius: 16,
              padding: '12px 14px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: isFullyPaid ? '#10B981' : '#E8920A',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: isFullyPaid ? '#047857' : '#92400E' }}>
                {isFullyPaid
                  ? `Table entièrement réglée · ${formatEur(paidCents)}`
                  : `Déjà réglé : ${formatEur(paidCents)}`}
              </div>
              {!isFullyPaid && (
                <div style={{ fontSize: 11.5, color: '#92400E', marginTop: 1 }}>
                  Reste à payer : <strong>{formatEur(remainingCents)}</strong>
                </div>
              )}
              {isFullyPaid && (
                <div style={{ fontSize: 11.5, color: '#047857', marginTop: 1 }}>
                  Merci à vous · La table est libérée par le restaurant
                </div>
              )}
            </div>
          </m.div>
        )}

        {/* 3 steps */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, alignItems: 'stretch' }}>
          {[
            { n: '1', label: 'Ton prénom' },
            { n: '2', label: 'Tes plats' },
            { n: '3', label: 'Paie en 10s' },
          ].map(s => (
            <div key={s.n} style={{
              flex: 1, background: '#fff', border: '1px solid #E5E7EB',
              borderRadius: 16, padding: '14px 6px', textAlign: 'center',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', margin: '0 auto 8px',
                background: 'linear-gradient(135deg, #E8920A, #B45309)',
                color: '#fff', fontSize: 12, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(232,146,10,0.4)',
              }}>
                {s.n}
              </div>
              <div style={{ fontSize: 10, color: '#374151', fontWeight: 700, lineHeight: 1.35 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 'max(32px, calc(20px + env(safe-area-inset-bottom)))' }}>
          <m.button
            type="button"
            whileTap={{ scale: 0.985 }}
            disabled={isFullyPaid}
            onClick={() => { if (!isFullyPaid) navigate('/profile') }}
            style={{
              width: '100%', height: 56, borderRadius: 18, border: 0,
              background: isFullyPaid ? '#E4E4E7' : '#E8920A',
              color: isFullyPaid ? '#A1A1AA' : '#fff',
              fontSize: 16, fontWeight: 800, letterSpacing: '0.01em',
              cursor: isFullyPaid ? 'default' : 'pointer',
              boxShadow: isFullyPaid ? 'none' : '0 4px 18px rgba(232,146,10,0.32), 0 1px 4px rgba(0,0,0,0.1)',
            }}
          >
            {isFullyPaid ? 'Table déjà réglée ✓' : hasPaidSomething ? 'Payer ma part →' : "C'est parti →"}
          </m.button>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', paddingBottom: 4 }}>
            ✓ Aucune app · <span style={{ color: '#E8920A', fontWeight: 600 }}>Paiement sécurisé Stripe</span>
          </div>
        </div>
      </div>
    </m.div>
  )
}
