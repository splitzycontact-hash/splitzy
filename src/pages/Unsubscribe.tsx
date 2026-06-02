import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation } from 'convex/react'
import { Helmet } from 'react-helmet-async'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

type Status = 'loading' | 'success' | 'error'

export function Unsubscribe() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const unsubscribe = useMutation(api.customers.unsubscribe)
  const [status, setStatus] = useState<Status>('loading')
  const ran = useRef(false)

  // Désabonnement déclenché une seule fois au montage (lien ouvert depuis l'email).
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!id) {
      setStatus('error')
      return
    }
    unsubscribe({ customerId: id as Id<'customers'> })
      .then(res => setStatus(res?.ok ? 'success' : 'error'))
      .catch(() => setStatus('error'))
  }, [id, unsubscribe])

  return (
    <div
      style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        background: '#18181B', padding: '24px',
      }}
    >
      <Helmet>
        <title>Désabonnement — Splitzy</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div style={{ maxWidth: 380, width: '100%' }}>
        {status === 'loading' && (
          <>
            <div
              style={{
                width: 40, height: 40, margin: '0 auto 20px',
                border: '3px solid rgba(255,255,255,0.12)', borderTop: '3px solid #E8920A',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ color: '#A1A1AA', fontSize: 14 }}>Traitement de votre demande…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </>
        )}

        {status === 'success' && (
          <>
            <div
              style={{
                width: 56, height: 56, margin: '0 auto 20px', borderRadius: '50%',
                background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M7 14.5L12 19.5L21 9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 10 }}>
              Vous avez été désabonné avec succès.
            </h1>
            <p style={{ color: '#A1A1AA', fontSize: 14, lineHeight: 1.6 }}>
              Vous ne recevrez plus d'offres marketing. Vous pouvez à tout moment redonner votre consentement
              lors d'un prochain paiement.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div
              style={{
                width: 56, height: 56, margin: '0 auto 20px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path d="M13 7v7M13 18.5h.01" stroke="#A1A1AA" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 10 }}>
              Lien invalide ou expiré
            </h1>
            <p style={{ color: '#A1A1AA', fontSize: 14, lineHeight: 1.6 }}>
              Nous n'avons pas pu traiter votre désabonnement. Écrivez-nous à{' '}
              <a href="mailto:privacy@splitzy.fr" style={{ color: '#E8920A', fontWeight: 600 }}>privacy@splitzy.fr</a>.
            </p>
          </>
        )}

        <Link
          to="/"
          style={{
            display: 'inline-block', marginTop: 28, fontSize: 13.5, fontWeight: 600,
            color: '#E8920A', textDecoration: 'none',
          }}
        >
          ← Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
