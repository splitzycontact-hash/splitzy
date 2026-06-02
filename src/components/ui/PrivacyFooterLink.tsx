import type { CSSProperties } from 'react'

/**
 * Lien discret « Confidentialité » pour le bas des écrans du flow client
 * (Confirmation, Feedback, Profile). Ouvre /privacy dans un nouvel onglet
 * pour ne pas faire perdre à l'utilisateur sa place dans le parcours de paiement.
 */
export function PrivacyFooterLink({ style }: { style?: CSSProperties }) {
  return (
    <div style={{ textAlign: 'center', padding: '14px 0 2px', ...style }}>
      <a
        href="/privacy"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 11.5,
          fontWeight: 500,
          color: '#A1A1AA',
          textDecoration: 'none',
          letterSpacing: '0.01em',
        }}
      >
        Confidentialité
      </a>
    </div>
  )
}
