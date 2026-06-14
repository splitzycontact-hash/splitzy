import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

// Page publique (pas d'auth) affichée après qu'un extra a cliqué un lien de réponse
// dans l'email de convocation. L'endpoint Convex /api/extra-response enregistre la
// réponse puis redirige ici avec ?answer=yes|no (succès) ou ?status=invalid
// (token inconnu / déjà utilisé). Aucun lien vers le dashboard : l'extra n'a pas de
// compte Splitzy.
export function ExtraResponseConfirmation() {
  const [params] = useSearchParams()
  const answer = params.get('answer')
  const counter = answer === 'counter'
  const invalid =
    params.get('status') === 'invalid' ||
    (answer !== 'yes' && answer !== 'no' && answer !== 'counter')
  const yes = answer === 'yes'

  const title = invalid
    ? 'Lien invalide ou déjà utilisé'
    : counter
      ? 'Contre-proposition envoyée !'
      : yes
        ? 'Merci ! Votre disponibilité a bien été confirmée.'
        : 'Merci pour votre réponse.'

  const subtitle = invalid
    ? "Ce lien n'est plus valable — il a peut-être déjà servi. Si vous pensez qu'il s'agit d'une erreur, contactez directement le restaurant."
    : counter
      ? 'Votre demande a été transmise au gérant. Il vous répondra par email rapidement.'
      : yes
        ? 'Le restaurant a bien reçu votre confirmation et reviendra vers vous pour les détails du service.'
        : "Vous avez indiqué ne pas être disponible pour ce service. Merci de l'avoir signalé."

  return (
    <div
      style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        background: '#18181B', padding: '24px',
      }}
    >
      <Helmet>
        <title>Réponse à votre convocation — Splitzy</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div style={{ maxWidth: 380, width: '100%' }}>
        <h2 style={{ color: '#E8920A', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 28px' }}>
          Splitzy
        </h2>

        {invalid ? (
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
        ) : counter ? (
          <div
            style={{
              width: 56, height: 56, margin: '0 auto 20px', borderRadius: '50%',
              background: '#E8920A', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26,
            }}
          >
            ✉️
          </div>
        ) : yes ? (
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
        ) : (
          <div
            style={{
              width: 56, height: 56, margin: '0 auto 20px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M7 13h12" stroke="#A1A1AA" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </div>
        )}

        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 10 }}>
          {title}
        </h1>
        <p style={{ color: '#A1A1AA', fontSize: 14, lineHeight: 1.6 }}>{subtitle}</p>
      </div>
    </div>
  )
}
