import { useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'
import {
  ExternalLink, CheckCircle2, Clock, AlertTriangle, Plug,
  ArrowRight, RefreshCw, Settings, ThumbsUp, Activity, X, Printer,
} from 'lucide-react'

const VOTE_KEY = 'splitzy-integration-voted'
const INITIAL_VOTES: Record<string, number> = { Pennylane: 142, Tiller: 98, Mailchimp: 76 }

export function Integrations() {
  const [requestModal, setRequestModal]   = useState(false)
  const [engineerModal, setEngineerModal] = useState(false)
  const [voted, setVoted] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(VOTE_KEY) ?? '[]')) }
    catch { return new Set() }
  })
  const [voteBoosts, setVoteBoosts] = useState<Record<string, number>>({})
  const [reqTool, setReqTool]   = useState('')
  const [reqDesc, setReqDesc]   = useState('')
  const [engName, setEngName]   = useState('')
  const [engMsg, setEngMsg]     = useState('')

  function handleVote(name: string) {
    if (voted.has(name)) return
    const next = new Set(voted); next.add(name)
    setVoted(next)
    setVoteBoosts(b => ({ ...b, [name]: (b[name] ?? 0) + 1 }))
    localStorage.setItem(VOTE_KEY, JSON.stringify([...next]))
  }

  function submitRequest() {
    const body = `Outil : ${reqTool}\n\nBesoin : ${reqDesc}`
    window.open(`mailto:splitzy.contact@gmail.com?subject=Demande d'intégration — ${encodeURIComponent(reqTool)}&body=${encodeURIComponent(body)}`, '_blank')
    setRequestModal(false); setReqTool(''); setReqDesc('')
  }

  function submitEngineer() {
    const body = `Nom : ${engName}\n\nMessage : ${engMsg}`
    window.open(`mailto:splitzy.contact@gmail.com?subject=Contact ingénieur Splitzy&body=${encodeURIComponent(body)}`, '_blank')
    setEngineerModal(false); setEngName(''); setEngMsg('')
  }

  return (
    <RestaurantLayout>
      <PageHeader
        title="Intégrations"
        subtitle={<span>Connectez votre caisse et vos outils métier</span>}
        actions={
          <>
            <span
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full text-[12px] font-semibold"
              style={{ background: 'var(--ds-success-soft)', color: 'var(--ds-success-strong)', border: '1px solid #C6F0D2' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ds-success)', animation: 'ds-live-blink 1.6s ease-in-out infinite' }} />
              Sync active
            </span>
            <button
              onClick={() => window.print()}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg border text-[13px] font-medium"
              style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', boxShadow: 'var(--ds-shadow-sm)' }}
            >
              <Printer size={14} />
              Imprimer rapport
            </button>
            <button
              onClick={() => window.open('https://www.splitzy.fr/aide', '_blank', 'noopener')}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg border text-[13px] font-medium"
              style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', boxShadow: 'var(--ds-shadow-sm)' }}
            >
              Documentation ↗
            </button>
            <button
              onClick={() => setRequestModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg text-[13px] font-semibold text-white"
              style={{ background: '#E8920A' }}
            >
              <Plug size={13} />
              Demander une intégration
            </button>
          </>
        }
      />

      <div className="px-4 py-5 md:px-9 md:py-6 space-y-5">

        {/* Network status hero */}
        <div className="ds-panel">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'var(--ds-border)' }}>
            {/* Stats */}
            <div className="px-6 py-5">
              <div className="text-[12px] font-semibold uppercase tracking-[0.07em] ds-text-tertiary mb-4">Réseau Splitzy</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Connectées', value: '4 / 6', ok: true },
                  { label: 'En attente', value: '1', warn: true },
                  { label: 'À configurer', value: '1', neutral: true },
                  { label: 'Volume 7j', value: '14 287', neutral: true },
                ].map(s => (
                  <div
                    key={s.label}
                    className="rounded-[8px] px-3 py-2.5 border"
                    style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}
                  >
                    <div className="text-[10.5px] uppercase tracking-[0.07em] ds-text-tertiary">{s.label}</div>
                    <div
                      className="font-bold text-[18px] tabular-nums mt-1 leading-none"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        color: s.ok ? 'var(--ds-success-strong)' : s.warn ? 'var(--ds-warning)' : 'var(--ds-text-primary)',
                      }}
                    >
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Flow diagram */}
            <div className="px-6 py-5 flex flex-col items-center justify-center gap-3">
              <div className="text-[12px] font-semibold uppercase tracking-[0.07em] ds-text-tertiary mb-1">Flux de données</div>
              <div className="flex items-center gap-2">
                {['Caisse', 'Splitzy', 'Paiement'].map((node, i) => (
                  <div key={node} className="flex items-center gap-2">
                    <div
                      className="px-3 py-2 rounded-[8px] text-[13px] font-semibold text-center"
                      style={{
                        background: i === 1 ? '#E8920A' : 'var(--ds-bg-subtle)',
                        color: i === 1 ? 'white' : 'var(--ds-text-primary)',
                        minWidth: '72px',
                      }}
                    >
                      {node}
                    </div>
                    {i < 2 && (
                      <div className="flex items-center gap-0.5">
                        <div className="w-4 h-px" style={{ background: 'var(--ds-accent)' }} />
                        <ArrowRight size={10} style={{ color: 'var(--ds-accent)' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-[12px] ds-text-tertiary">14 287 événements · 7 derniers jours</div>
            </div>

            {/* Status */}
            <div className="px-6 py-5 flex flex-col justify-center">
              <div className="text-[12px] font-semibold uppercase tracking-[0.07em] ds-text-tertiary mb-3">Santé du réseau</div>
              {[
                { label: 'Latence P50',  value: '48 ms', ok: true },
                { label: 'Uptime 30j',   value: '99,98%', ok: true },
                { label: 'Erreurs 24h',  value: '0 erreur', ok: true },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-1.5 text-[12.5px]">
                  <span className="ds-text-secondary">{s.label}</span>
                  <span className="font-semibold ds-text-success-strong">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alert banner */}
        <div
          className="flex items-center gap-3 px-5 py-3.5 rounded-[12px] border"
          style={{ background: 'var(--ds-warning-soft)', borderColor: '#F5DDB3' }}
        >
          <AlertTriangle size={16} style={{ color: 'var(--ds-warning)', flexShrink: 0 }} />
          <div className="flex-1 text-[13px]" style={{ color: '#92400E' }}>
            <strong>Lightspeed</strong> — Authentification OAuth en attente. Expire dans <strong>23 min</strong>.
          </div>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold text-white flex-shrink-0"
            style={{ background: 'var(--ds-warning)' }}
          >
            Finaliser
          </button>
        </div>

        {/* POS & Caisse */}
        <section>
          <div className="text-[12px] font-semibold uppercase tracking-[0.07em] ds-text-tertiary mb-3 px-0.5">Caisse & POS</div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">

            {/* Square — connected */}
            <IntegCard
              logo="■" logoBg="#1A1A1A" logoColor="white"
              name="Square" status="connected" statusLabel="Connecté"
              desc="Synchronisation menu et paiements en temps réel. Votre caisse Square est connectée et active."
              meta={[
                { label: 'Dernier événement', value: 'il y a 12 s' },
                { label: 'Tables synchronisées', value: '10 / 10' },
                { label: 'Latence', value: '28 ms' },
              ]}
              actions={[
                { label: 'Gérer', primary: false },
                { label: 'Synchroniser', primary: false, icon: RefreshCw },
              ]}
              syncBars={[3, 4, 5, 4, 5, 5, 4]}
            />

            {/* Lightspeed — pending OAuth */}
            <IntegCard
              logo="LS" logoBg="#FF6B00" logoColor="white"
              name="Lightspeed" status="pending" statusLabel="OAuth en cours"
              desc="Synchronisation en temps réel des additions et du menu. Connexion OAuth démarrée."
              meta={[
                { label: 'OAuth démarré', value: 'il y a 7 min' },
                { label: 'Expiration', value: 'dans 23 min', warn: true },
              ]}
              actions={[
                { label: 'Annuler', primary: false },
                { label: 'Finaliser OAuth', primary: true },
              ]}
            />

            {/* Zelty — to configure */}
            <IntegCard
              logo="ZL" logoBg="#7C3AED" logoColor="white"
              name="Zelty" status="pending" statusLabel="À configurer"
              desc="Caisse tout-en-un pour restaurants français. Import automatique des additions et du menu."
              meta={[
                { label: 'Pré-requis', value: 'Clé API + ID resto' },
              ]}
              actions={[
                { label: 'Configurer', primary: true, icon: Settings },
              ]}
            />

            {/* L'Addition */}
            <IntegCard
              logo="LA" logoBg="#2563EB" logoColor="white"
              name="L'Addition" status="pending" statusLabel="À configurer"
              desc="Caisse enregistreuse française pensée pour la restauration. Import automatique des tickets."
              meta={[
                { label: 'Pré-requis', value: 'Clé API + ID établissement' },
              ]}
              actions={[
                { label: 'Configurer', primary: true, icon: Settings },
              ]}
            />

          </div>
        </section>

        {/* Paiements */}
        <section>
          <div className="text-[12px] font-semibold uppercase tracking-[0.07em] ds-text-tertiary mb-3 px-0.5">Paiements</div>
          <div className="ds-panel">
            <div className="flex items-start gap-4 p-5">
              <div
                className="w-12 h-12 rounded-[10px] flex items-center justify-center font-bold text-[14px] flex-shrink-0 text-white"
                style={{ background: '#635BFF' }}
              >
                S
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-[15px] ds-text-primary">Stripe Connect</div>
                    <div className="text-[12.5px] ds-text-secondary mt-0.5 leading-[1.4]">
                      Traitement des paiements par carte, Apple Pay et Google Pay. KYC validé.
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-[4px] rounded-full text-[11px] font-semibold flex-shrink-0"
                    style={{ background: 'var(--ds-success-soft)', color: 'var(--ds-success-strong)' }}
                  >
                    <CheckCircle2 size={11} />
                    Connecté
                  </span>
                </div>
                <div className="flex items-center gap-5 mt-3 text-[12px] ds-text-secondary flex-wrap">
                  <span>CA 7j : <strong className="ds-text-primary">4 128,50 €</strong></span>
                  <span>Taux échec : <strong className="ds-text-primary">0,2%</strong></span>
                  <span>Compte : <strong className="ds-text-primary font-mono text-[11.5px]">acct_1O3x…</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => window.open('https://dashboard.stripe.com/connect/accounts', '_blank', 'noopener')}
                  className="inline-flex items-center gap-1 px-3 py-[7px] rounded-lg border text-[12.5px] font-medium"
                  style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                >
                  Gérer ↗
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Infrastructure */}
        <section>
          <div className="text-[12px] font-semibold uppercase tracking-[0.07em] ds-text-tertiary mb-3 px-0.5">Infrastructure</div>
          <div className="ds-panel">
            <div className="flex items-start gap-4 p-5">
              <div
                className="w-12 h-12 rounded-[10px] flex items-center justify-center font-bold text-[14px] flex-shrink-0 text-white"
                style={{ background: '#E8920A' }}
              >
                CV
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-[15px] ds-text-primary">Convex</div>
                    <div className="text-[12.5px] ds-text-secondary mt-0.5 leading-[1.4]">
                      Base de données temps réel et backend serverless. Région eu-west-3.
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-[4px] rounded-full text-[11px] font-semibold flex-shrink-0"
                    style={{ background: 'var(--ds-success-soft)', color: 'var(--ds-success-strong)' }}
                  >
                    <Activity size={11} />
                    Opérationnel
                  </span>
                </div>
                <div className="flex items-center gap-5 mt-3 text-[12px] ds-text-secondary flex-wrap">
                  <span>Région : <strong className="ds-text-primary">eu-west-3</strong></span>
                  <span>Uptime 30j : <strong className="ds-text-primary">99,98%</strong></span>
                  <span>P50 : <strong className="ds-text-primary">48 ms</strong></span>
                </div>
              </div>
              <button
                onClick={() => window.open('https://status.convex.dev', '_blank', 'noopener')}
                className="inline-flex items-center gap-1 px-3 py-[7px] rounded-lg border text-[12.5px] font-medium flex-shrink-0"
                style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
              >
                Status ↗
                <ExternalLink size={12} />
              </button>
            </div>
          </div>
        </section>

        {/* Coming soon */}
        <section>
          <div className="text-[12px] font-semibold uppercase tracking-[0.07em] ds-text-tertiary mb-3 px-0.5">Bientôt disponibles</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {[
              { name: 'Pennylane', desc: 'Synchronisation comptabilité automatique. Export des factures et CA.', votes: 142 },
              { name: 'Tiller',    desc: 'Caisse cloud restaurant. Sync additions et menu en temps réel.',        votes: 98  },
              { name: 'Mailchimp', desc: "Campagnes d'emailing clients. Envoi automatique après chaque visite.",  votes: 76  },
            ].map(item => (
              <div
                key={item.name}
                className="ds-panel p-5 flex flex-col gap-3"
                style={{ opacity: 0.75 }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[14px] ds-text-primary">{item.name}</div>
                  <span
                    className="text-[11px] font-medium px-2 py-[2px] rounded-full"
                    style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-tertiary)' }}
                  >
                    Bientôt
                  </span>
                </div>
                <p className="text-[12.5px] ds-text-secondary leading-[1.5]">{item.desc}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[12px] ds-text-tertiary">
                    <ThumbsUp size={11} className="inline mr-1" />
                    {(INITIAL_VOTES[item.name] ?? item.votes) + (voteBoosts[item.name] ?? 0)} votes
                  </span>
                  <button
                    onClick={() => handleVote(item.name)}
                    className="text-[12.5px] font-medium transition-colors"
                    style={{ color: voted.has(item.name) ? 'var(--ds-success-strong)' : 'var(--ds-accent)' }}
                  >
                    {voted.has(item.name) ? 'Voté ✓' : 'Voter →'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Doc CTA */}
        <div
          className="flex flex-col md:flex-row items-center gap-5 px-7 py-6 rounded-[14px] border"
          style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', borderStyle: 'dashed' }}
        >
          <div className="flex-1">
            <div className="font-bold text-[15px] ds-text-primary mb-1">Besoin d'une intégration sur mesure ?</div>
            <p className="text-[13px] ds-text-secondary leading-[1.5]">
              Notre équipe développe des intégrations personnalisées pour tout logiciel de caisse ou outil métier.
              Parlez-nous de votre besoin.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => window.open('https://www.splitzy.fr/aide', '_blank', 'noopener')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] border text-[13px] font-medium"
              style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
            >
              Documentation API ↗
              <ExternalLink size={13} />
            </button>
            <button
              onClick={() => setEngineerModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] text-[13px] font-semibold text-white"
              style={{ background: '#E8920A' }}
            >
              Parler à un ingénieur
            </button>
          </div>
        </div>

      </div>
      {/* Request integration modal */}
      <AnimatePresence>
        {requestModal && (
          <m.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) setRequestModal(false) }}>
            <m.div className="rounded-2xl overflow-hidden w-[420px] max-w-full" style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }} initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
                <span className="font-bold text-[15px] ds-text-primary">Demander une intégration</span>
                <button onClick={() => setRequestModal(false)} className="ds-text-tertiary hover:ds-text-primary"><X size={16} /></button>
              </div>
              <div className="px-5 py-5 space-y-4">
                <div>
                  <label className="block text-[11.5px] font-semibold ds-text-secondary mb-1.5 uppercase tracking-[0.06em]">Nom de l'outil</label>
                  <input value={reqTool} onChange={e => setReqTool(e.target.value)} placeholder="ex: Pennylane, Lightspeed, Odoo…" className="w-full rounded-lg border px-3 py-2 outline-none" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }} autoFocus />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold ds-text-secondary mb-1.5 uppercase tracking-[0.06em]">Description du besoin</label>
                  <textarea value={reqDesc} onChange={e => setReqDesc(e.target.value)} placeholder="Décrivez ce que vous souhaitez synchroniser ou automatiser…" rows={3} className="w-full rounded-lg border px-3 py-2 outline-none resize-none" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }} />
                </div>
                <p className="text-[12px] ds-text-tertiary">Votre demande sera envoyée à splitzy.contact@gmail.com via votre client mail.</p>
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button onClick={() => setRequestModal(false)} className="flex-1 rounded-xl border text-sm font-semibold py-2.5" style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}>Annuler</button>
                <button onClick={submitRequest} disabled={!reqTool.trim()} className="flex-1 rounded-xl text-white text-sm font-semibold py-2.5 disabled:opacity-50" style={{ background: '#E8920A' }}>Envoyer →</button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Engineer contact modal */}
      <AnimatePresence>
        {engineerModal && (
          <m.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) setEngineerModal(false) }}>
            <m.div className="rounded-2xl overflow-hidden w-[420px] max-w-full" style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }} initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
                <span className="font-bold text-[15px] ds-text-primary">Parler à un ingénieur</span>
                <button onClick={() => setEngineerModal(false)} className="ds-text-tertiary hover:ds-text-primary"><X size={16} /></button>
              </div>
              <div className="px-5 py-5 space-y-4">
                <div>
                  <label className="block text-[11.5px] font-semibold ds-text-secondary mb-1.5 uppercase tracking-[0.06em]">Votre nom</label>
                  <input value={engName} onChange={e => setEngName(e.target.value)} placeholder="Prénom Nom" className="w-full rounded-lg border px-3 py-2 outline-none" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }} autoFocus />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold ds-text-secondary mb-1.5 uppercase tracking-[0.06em]">Votre demande</label>
                  <textarea value={engMsg} onChange={e => setEngMsg(e.target.value)} placeholder="Décrivez votre projet d'intégration sur mesure…" rows={4} className="w-full rounded-lg border px-3 py-2 outline-none resize-none" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }} />
                </div>
                <p className="text-[12px] ds-text-tertiary">Ouvrira votre client mail avec le message pré-rempli.</p>
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button onClick={() => setEngineerModal(false)} className="flex-1 rounded-xl border text-sm font-semibold py-2.5" style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}>Annuler</button>
                <button onClick={submitEngineer} disabled={!engName.trim()} className="flex-1 rounded-xl text-white text-sm font-semibold py-2.5 disabled:opacity-50" style={{ background: '#E8920A' }}>Envoyer →</button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </RestaurantLayout>
  )
}

// ── Shared IntegCard component ────────────────────────────────

type IntegAction = { label: string; primary: boolean; icon?: React.ElementType }

function IntegCard({
  logo, logoBg, logoColor, name, status, statusLabel, desc, meta, actions, syncBars,
}: {
  logo: string; logoBg: string; logoColor: string
  name: string; status: 'connected' | 'pending'
  statusLabel: string; desc: string
  meta: { label: string; value: string; warn?: boolean }[]
  actions: IntegAction[]
  syncBars?: number[]
}) {
  return (
    <div className="ds-panel p-5">
      <div className="flex items-start gap-3.5">
        {/* Logo */}
        <div
          className="w-11 h-11 rounded-[10px] flex items-center justify-center text-[13px] font-bold flex-shrink-0"
          style={{ background: logoBg, color: logoColor }}
        >
          {logo}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="font-bold text-[14.5px] ds-text-primary">{name}</div>
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-[3px] rounded-full flex-shrink-0"
              style={
                status === 'connected'
                  ? { background: 'var(--ds-success-soft)', color: 'var(--ds-success-strong)' }
                  : { background: 'var(--ds-warning-soft)', color: 'var(--ds-warning)' }
              }
            >
              {status === 'connected' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
              {statusLabel}
            </span>
          </div>

          <p className="text-[12.5px] ds-text-secondary leading-[1.45] mb-3">{desc}</p>

          {/* Sync bars */}
          {syncBars && (
            <div className="flex items-end gap-0.5 h-5 mb-3">
              {syncBars.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-[2px]"
                  style={{ height: `${(v / 5) * 100}%`, background: '#E8920A', opacity: 0.6 + (i / syncBars.length) * 0.4 }}
                />
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
            {meta.map(m => (
              <div key={m.label} className="text-[12px]">
                <span className="ds-text-tertiary">{m.label} : </span>
                <span
                  className="font-semibold"
                  style={{ color: m.warn ? 'var(--ds-warning)' : 'var(--ds-text-primary)' }}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {actions.map(({ label, primary, icon: Icon }) => (
              <button
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[8px] border text-[12.5px] font-medium transition-colors"
                style={
                  primary
                    ? { background: '#E8920A', borderColor: '#E8920A', color: 'white' }
                    : { background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }
                }
              >
                {Icon && <Icon size={12} />}
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
