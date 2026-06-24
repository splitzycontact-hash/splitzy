import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useAction } from 'convex/react'
import { useClerk, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import type { Id } from '../../../convex/_generated/dataModel'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import {
  Download, Store, QrCode, UserCog, Bell, UserRound,
  CreditCard, Sparkles, Plus, MoreHorizontal, Trash2,
  Check, Shield, KeyRound, ChevronRight, Utensils, Beer, Coffee, Upload, X,
  Mail, Phone, Archive, History, Pencil, LayoutGrid,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'
import { useRestaurant, useRestaurantId, useRestaurantRole } from '../context/RestaurantContext'
import FloorPlan from '../components/floor/FloorPlan'
import { ZONE_PALETTE } from '../components/floor/floorColors'
import { assignEmoji, normalizeCategoryId } from '../../utils/menuEmoji'
import { generateBillingInvoicePDF, downloadAllInvoices, type BillingInvoiceData } from '../../utils/generateBillingInvoice'

// MFA désactivé : nécessite upgrade Clerk plan Pro (TOTP/Backup codes
// non dispo sur Hobby). Réactiver en passant FEATURE_MFA_ENABLED à true
// une fois le plan Clerk upgradé + toggles MFA réactivés sur
// dashboard.clerk.com (instance clerk.splitzy.fr).
const FEATURE_MFA_ENABLED = false

type SectionKey = 'restaurant' | 'menu' | 'tables' | 'qr' | 'notifications' | 'pos' | 'billing' | 'team' | 'account' | 'plan'

const SUB_NAV: { key: SectionKey; label: string; icon: React.ElementType; pendingDot?: boolean }[] = [
  { key: 'restaurant',    label: 'Restaurant',       icon: Store       },
  { key: 'tables',        label: 'Tables & Plan',     icon: LayoutGrid  },
  { key: 'qr',            label: 'QR Codes',          icon: QrCode      },
  { key: 'team',          label: 'Équipe',            icon: UserCog, pendingDot: true },
  { key: 'notifications', label: 'Notifications',    icon: Bell        },
  { key: 'account',       label: 'Compte',            icon: UserRound   },
  { key: 'billing',       label: 'Facturation',       icon: CreditCard  },
  { key: 'plan',          label: "Plan & abonnement", icon: Sparkles    },
]

const ESTABLISHMENT_TYPES: { id: string; icon: React.ElementType; label: string }[] = [
  { id: 'restaurant', icon: Utensils, label: 'Restaurant' },
  { id: 'bar',        icon: Beer,     label: 'Bar' },
  { id: 'cafe',       icon: Coffee,   label: 'Café' },
]

type PosStatus = 'connect' | 'connected' | 'soon'

type PosField = { key: string; label: string; placeholder: string; type?: string; convexField: 'apiKey' | 'locationId' | 'extraKey' }

type PosIntegration = {
  id: string
  name: string
  logoColor: string
  logoText: string
  description: string
  badge?: string
  badgeStyle?: string
  status: PosStatus
  fields: PosField[]
  docsUrl?: string
}

const POS_INTEGRATIONS: PosIntegration[] = [
  {
    id: 'lightspeed',
    name: 'Lightspeed',
    logoColor: '#FF6B00',
    logoText: 'LS',
    description: 'Synchronisation en temps réel des additions et du menu. Idéal pour les restaurants à fort volume.',
    badge: 'Recommandé',
    badgeStyle: 'bg-brand-bg text-brand border border-brand/20',
    status: 'connect',
    fields: [
      { key: 'apiKey',     label: 'Clé API',      placeholder: 'ls_prod_xxxxxxxxxxxxxxxx', convexField: 'apiKey' as const },
      { key: 'locationId', label: 'Location ID',  placeholder: '123456', convexField: 'locationId' as const },
    ],
  },
  {
    id: 'laddition',
    name: "L'Addition",
    logoColor: '#2563EB',
    logoText: 'LA',
    description: 'Caisse enregistreuse française pensée pour la restauration. Import automatique des tickets.',
    status: 'connect',
    fields: [
      { key: 'apiKey',         label: 'Clé API',            placeholder: 'lad_xxxxxxxxxxxx', convexField: 'apiKey' as const },
      { key: 'establishmentId', label: 'ID établissement',  placeholder: 'EST-00001', convexField: 'extraKey' as const },
    ],
  },
  {
    id: 'zelty',
    name: 'Zelty',
    logoColor: '#7C3AED',
    logoText: 'ZL',
    description: 'POS cloud français dédié aux CHR. Synchronisation du plan de salle et des commandes.',
    status: 'connect',
    fields: [
      { key: 'apiToken',    label: 'Token API',       placeholder: 'zlt_xxxxxxxxxxxxxxxx', convexField: 'apiKey' as const },
      { key: 'restaurantId', label: 'Restaurant ID',  placeholder: 'rest_000001', convexField: 'locationId' as const },
    ],
  },
  {
    id: 'tiller',
    name: 'Tiller (SumUp)',
    logoColor: '#059669',
    logoText: 'TL',
    description: 'Caisse tactile française désormais intégrée à SumUp. Import des tables et montants.',
    status: 'connect',
    fields: [
      { key: 'apiKey',    label: 'Clé API SumUp',  placeholder: 'sup_xxxxxxxxxxxxxxxx', convexField: 'apiKey' as const },
      { key: 'businessId', label: 'Business ID',   placeholder: 'biz_000001', convexField: 'extraKey' as const },
    ],
  },
  {
    id: 'square',
    name: 'Square',
    logoColor: '#18181B',
    logoText: 'SQ',
    description: 'Solution de paiement et gestion des commandes. Disponible en France depuis 2022.',
    status: 'connect',
    fields: [
      { key: 'accessToken', label: 'Access Token',  placeholder: 'EAAAl_xxxxxxxxxxxxxxxxxxxx', convexField: 'apiKey' as const },
      { key: 'locationId',  label: 'Location ID',   placeholder: 'LXXXXXXXXXXXXXXXX', convexField: 'locationId' as const },
    ],
  },
  {
    id: 'sumup',
    name: 'SumUp',
    logoColor: '#1D4ED8',
    logoText: 'SU',
    description: 'Terminal de paiement et caisse tout-en-un. Récupération automatique des encaissements.',
    status: 'connect',
    fields: [
      { key: 'apiKey',      label: 'Clé API',     placeholder: 'sup_sk_xxxxxxxxxxxxxxxx', convexField: 'apiKey' as const },
      { key: 'merchantCode', label: 'Merchant ID', placeholder: 'MXXXXX', convexField: 'extraKey' as const },
    ],
  },
  {
    id: 'clover',
    name: 'Clover',
    logoColor: '#16A34A',
    logoText: 'CL',
    description: 'POS américain disponible en Europe. Synchronisation des commandes et du menu.',
    status: 'soon',
    fields: [],
  },
  {
    id: 'csv',
    name: 'Import CSV',
    logoColor: '#64748B',
    logoText: 'CSV',
    description: 'Importez manuellement vos données depuis n\'importe quelle caisse via un fichier CSV.',
    badge: 'Sans connexion',
    badgeStyle: 'bg-gray-100 text-gray-500 border border-gray-200',
    status: 'connect',
    fields: [],
  },
  {
    id: 'api',
    name: 'API personnalisée',
    logoColor: '#0F172A',
    logoText: 'API',
    description: 'Connectez n\'importe quelle caisse via notre API REST. Documentation disponible.',
    badge: 'Bientôt',
    badgeStyle: 'bg-gray-100 text-gray-400 border border-gray-200',
    status: 'soon',
    fields: [],
  },
]

type CsvRow = { tableNumber: number; amountCents: number }
type MenuRow = { name: string; price: number; category: string }
type CsvResult = { kind: 'tables'; rows: CsvRow[] } | { kind: 'menu'; rows: MenuRow[] }
type CsvStep = 'idle' | 'preview' | 'importing' | 'done'

type TableRef = { _id: Id<'tables'>; number: number }

function parseCsv(text: string): CsvResult | string {
  const lines = text.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return 'Le fichier est vide ou ne contient pas de données.'
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['"]/g, ''))

  const tIdx = headers.findIndex(h => h === 'table' || h === 'n°' || h === 'no' || h === 'num' || h === 'numero')
  const aIdx = headers.findIndex(h => h.includes('montant') || h.includes('amount') || h.includes('total') || h.includes('addition'))
  const nIdx = headers.findIndex(h => h.includes('nom') || h.includes('name') || h.includes('article') || h.includes('produit') || h.includes('libelle') || h.includes('designation') || h.includes('plat'))
  const pIdx = headers.findIndex(h => h.includes('prix') || h.includes('price') || h.includes('tarif') || h.includes('montant') || h.includes('amount'))
  const cIdx = headers.findIndex(h => h.includes('categorie') || h.includes('category') || h.includes('type') || h.includes('famille') || h.includes('rubrique'))

  const isTableCsv = tIdx !== -1 && aIdx !== -1
  const isMenuCsv  = nIdx !== -1 && pIdx !== -1

  if (!isTableCsv && !isMenuCsv) {
    return `Colonnes non reconnues. Pour un menu : colonnes "nom" et "prix". Pour des tables : colonnes "table" et "montant".`
  }

  if (isTableCsv) {
    const rows: CsvRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => c.trim().replace(/['"]/g, ''))
      const tableNumber = parseInt(cols[tIdx] ?? '')
      const raw = (cols[aIdx] ?? '').replace(',', '.').replace(/[€$\s]/g, '')
      const euros = parseFloat(raw)
      if (isNaN(tableNumber) || isNaN(euros)) continue
      rows.push({ tableNumber, amountCents: Math.round(euros * 100) })
    }
    if (rows.length === 0) return 'Aucune ligne valide trouvée.'
    return { kind: 'tables', rows }
  }

  // menu CSV
  const rows: MenuRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/['"]/g, ''))
    const name = cols[nIdx] ?? ''
    const raw = (cols[pIdx] ?? '').replace(',', '.').replace(/[€$\s]/g, '')
    const price = parseFloat(raw)
    if (!name || isNaN(price)) continue
    rows.push({ name, price, category: cIdx !== -1 ? (cols[cIdx] ?? '') : '' })
  }
  if (rows.length === 0) return 'Aucune ligne valide trouvée.'
  return { kind: 'menu', rows }
}

function PosSection({ tables, restaurantId }: { tables: TableRef[]; restaurantId: Id<'restaurants'> | null }) {
  const importAmounts = useMutation(api.tables.importAmounts)
  const replaceMenu = useMutation(api.menuItems.replaceAll)
  const upsertIntegration = useMutation(api.posIntegrations.upsert)
  const removeIntegration = useMutation(api.posIntegrations.remove)
  const syncTablesAction = useAction(api.posIntegrations.syncTables)

  const integrations = useQuery(
    api.posIntegrations.listByRestaurant,
    restaurantId ? { restaurantId } : 'skip'
  )

  const [modal, setModal] = useState<PosIntegration | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)

  // CSV state
  const [csvStep, setCsvStep] = useState<CsvStep>('idle')
  const [csvResult, setCsvResult] = useState<CsvResult | null>(null)
  const [csvError, setCsvError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function getIntegration(id: string) {
    return integrations?.find(i => i.provider === id) ?? null
  }

  function isConnected(id: string) {
    return integrations?.some(i => i.provider === id) ?? false
  }

  function openModal(pos: PosIntegration) {
    if (pos.status === 'soon') return
    const existing = getIntegration(pos.id)
    const prefilled: Record<string, string> = {}
    if (existing) {
      pos.fields.forEach(f => {
        if (f.convexField === 'apiKey') prefilled[f.key] = existing.hasApiKey ? '••••••••' : ''
        else if (f.convexField === 'locationId') prefilled[f.key] = existing.locationId ?? ''
        else if (f.convexField === 'extraKey') prefilled[f.key] = existing.hasApiKey ? '••••••••' : ''
      })
    }
    setFields(prefilled)
    setSaved(false)
    setCsvStep('idle')
    setCsvResult(null)
    setCsvError('')
    setModal(pos)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const result = parseCsv(text)
      if (typeof result === 'string') {
        setCsvError(result)
        setCsvStep('idle')
      } else {
        setCsvResult(result)
        setCsvError('')
        setCsvStep('preview')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleCsvImport() {
    if (!csvResult) return
    setCsvStep('importing')
    if (csvResult.kind === 'tables') {
      const rows = csvResult.rows
        .map(r => {
          const t = tables.find(t => t.number === r.tableNumber)
          return t ? { tableId: t._id, amountCents: r.amountCents } : null
        })
        .filter((r): r is { tableId: Id<'tables'>; amountCents: number } => r !== null)
      await importAmounts({ rows })
    } else if (restaurantId) {
      const items = csvResult.rows.map(r => ({
        name: r.name,
        category: normalizeCategoryId(r.category),
        priceCents: Math.round(r.price * 100),
        emoji: assignEmoji(r.name, r.category),
        description: undefined as string | undefined,
      }))
      await replaceMenu({ restaurantId, items })
    }
    setCsvStep('done')
  }

  async function handleConnect() {
    if (!modal || !restaurantId) return
    setSaving(true)
    let apiKey = ''
    let locationId: string | undefined
    let extraKey: string | undefined
    for (const field of modal.fields) {
      const value = fields[field.key]?.trim() ?? ''
      if (field.convexField === 'apiKey') apiKey = value
      else if (field.convexField === 'locationId') locationId = value || undefined
      else if (field.convexField === 'extraKey') extraKey = value || undefined
    }
    try {
      await upsertIntegration({ restaurantId, provider: modal.id, apiKey, locationId, extraKey })
      setSaved(true)
      setTimeout(() => { setModal(null); setSaved(false) }, 1200)
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect(id: string) {
    if (!restaurantId) return
    await removeIntegration({ restaurantId, provider: id })
    setModal(null)
  }

  async function handleSync(provider: string) {
    if (!restaurantId || syncing) return
    setSyncing(provider)
    try {
      await syncTablesAction({ restaurantId, provider })
    } finally {
      setSyncing(null)
    }
  }

  return (
    <>
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-border shadow-card p-6">
          <h2 className="text-base font-bold text-dark mb-1">Intégrations POS</h2>
          <p className="text-sm text-muted mb-6">
            Connectez votre caisse enregistreuse pour synchroniser automatiquement les additions avec Splitzy.
          </p>

          {/* Connected first */}
          {integrations && integrations.length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Connecté</div>
              <div className="grid grid-cols-1 gap-3">
                {POS_INTEGRATIONS.filter(p => isConnected(p.id)).map(pos => (
                  <PosCard key={pos.id} pos={pos} connected onClick={() => openModal(pos)} />
                ))}
              </div>
            </div>
          )}

          {/* Available */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Disponibles</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {POS_INTEGRATIONS.filter(p => !isConnected(p.id) && p.status !== 'soon').map(pos => (
                <PosCard key={pos.id} pos={pos} connected={false} onClick={() => openModal(pos)} />
              ))}
            </div>
          </div>

          {/* Soon */}
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Bientôt disponibles</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {POS_INTEGRATIONS.filter(p => p.status === 'soon').map(pos => (
                <PosCard key={pos.id} pos={pos} connected={false} onClick={() => {}} />
              ))}
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-brand-bg border border-brand/20 rounded-xl p-4 flex gap-3">
          <span className="text-lg shrink-0">💡</span>
          <div>
            <div className="text-sm font-semibold text-dark mb-0.5">Votre caisse n'est pas listée ?</div>
            <div className="text-xs text-muted">
              Contactez-nous à{' '}
              <a href="mailto:splitzy.contact@gmail.com" className="text-brand underline">
                splitzy.contact@gmail.com
              </a>
              {' '}— nous ajoutons de nouvelles intégrations chaque mois.
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                style={{ backgroundColor: modal.logoColor }}
              >
                {modal.logoText}
              </div>
              <div>
                <div className="text-base font-bold text-dark">{modal.name}</div>
                <div className="text-xs text-muted">{modal.description}</div>
              </div>
            </div>

            {isConnected(modal.id) ? (
              (() => {
                const integration = getIntegration(modal.id)
                const isActive = integration?.status === 'active'
                const isError = integration?.status === 'error'
                return (
                  <>
                    <div className={`flex items-center gap-2 rounded-xl px-4 py-3 mb-4 ${
                      isActive ? 'bg-green-50 border border-green-200' :
                      isError  ? 'bg-red-50 border border-red-200' :
                                 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-yellow-500'}`} />
                      <span className={`text-sm font-semibold ${isActive ? 'text-green-700' : isError ? 'text-red-700' : 'text-yellow-700'}`}>
                        {isActive ? 'Connecté et actif' : isError ? 'Erreur de synchronisation' : 'En attente de sync'}
                      </span>
                    </div>

                    {isError && integration?.lastError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                        <p className="text-xs text-red-600">{integration.lastError}</p>
                      </div>
                    )}

                    {(integration?.lastSyncAt || integration?.syncedTableCount != null) && (
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        {integration?.lastSyncAt && (
                          <div className="bg-bg rounded-lg px-3 py-2">
                            <div className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-0.5">Dernière sync</div>
                            <div className="text-xs font-semibold text-dark">
                              {new Date(integration.lastSyncAt).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                            </div>
                          </div>
                        )}
                        {integration?.syncedTableCount != null && (
                          <div className="bg-bg rounded-lg px-3 py-2">
                            <div className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-0.5">Tables sync</div>
                            <div className="text-xs font-semibold text-dark">{integration.syncedTableCount}</div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSync(modal.id)}
                        disabled={syncing === modal.id}
                        className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {syncing === modal.id
                          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sync…</>
                          : '↻ Synchroniser'
                        }
                      </button>
                      <button
                        onClick={() => handleDisconnect(modal.id)}
                        className="flex-1 py-2.5 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Déconnecter
                      </button>
                    </div>
                  </>
                )
              })()
            ) : modal.id === 'csv' ? (
              <>
                {csvStep === 'idle' && (
                  <>
                    <p className="text-sm text-muted mb-4">
                      Importez un CSV depuis votre caisse. Splitzy détecte automatiquement s'il s'agit d'un <strong>menu</strong> ou d'<strong>additions par table</strong>.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-bg rounded-lg px-3 py-2">
                        <div className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1">Menu</div>
                        <div className="text-xs text-muted font-mono">nom;prix;categorie<br />Entrecôte;28.50;Plats<br />Tiramisu;9.00;Desserts</div>
                      </div>
                      <div className="bg-bg rounded-lg px-3 py-2">
                        <div className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1">Additions</div>
                        <div className="text-xs text-muted font-mono">table;montant<br />1;42.50<br />2;87.40</div>
                      </div>
                    </div>
                    {csvError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 mb-4">
                        {csvError}
                      </div>
                    )}
                    <label className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl py-7 px-4 cursor-pointer hover:border-brand/40 hover:bg-brand-bg/30 transition-colors mb-4">
                      <span className="text-2xl">📂</span>
                      <span className="text-sm font-semibold text-dark">Sélectionner un fichier CSV</span>
                      <span className="text-xs text-muted">Cliquez ou glissez</span>
                      <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
                    </label>
                    <button onClick={() => setModal(null)} className="w-full py-2.5 rounded-xl border border-border text-sm font-semibold text-mid hover:bg-bg transition-colors">
                      Fermer
                    </button>
                  </>
                )}

                {csvStep === 'preview' && csvResult && (
                  <>
                    {csvResult.kind === 'menu' ? (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-semibold bg-brand-bg text-brand border border-brand/20 rounded-full px-2 py-0.5">Menu détecté</span>
                          <span className="text-sm text-muted"><strong className="text-dark">{csvResult.rows.length} articles</strong> trouvés</span>
                        </div>
                        <div className="border border-border rounded-xl overflow-hidden mb-5 max-h-52 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-bg border-b border-border">
                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted uppercase tracking-wide">Article</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted uppercase tracking-wide">Catégorie</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-muted uppercase tracking-wide">Prix</th>
                              </tr>
                            </thead>
                            <tbody>
                              {csvResult.rows.map((r, i) => (
                                <tr key={i} className="border-b border-border last:border-b-0">
                                  <td className="px-3 py-2 font-medium text-dark">{r.name}</td>
                                  <td className="px-3 py-2 text-muted text-xs">{r.category || '—'}</td>
                                  <td className="px-3 py-2 text-right text-dark">{r.price.toFixed(2).replace('.', ',')} €</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 rounded-full px-2 py-0.5">Additions détectées</span>
                          <span className="text-sm text-muted"><strong className="text-dark">{csvResult.rows.length} tables</strong> trouvées</span>
                        </div>
                        <div className="border border-border rounded-xl overflow-hidden mb-5 max-h-52 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-bg border-b border-border">
                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted uppercase tracking-wide">Table</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-muted uppercase tracking-wide">Montant</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-muted uppercase tracking-wide">Statut</th>
                              </tr>
                            </thead>
                            <tbody>
                              {csvResult.rows.map(r => {
                                const found = tables.some(t => t.number === r.tableNumber)
                                return (
                                  <tr key={r.tableNumber} className="border-b border-border last:border-b-0">
                                    <td className="px-3 py-2 font-medium text-dark">Table {r.tableNumber}</td>
                                    <td className="px-3 py-2 text-right text-dark">{(r.amountCents / 100).toFixed(2).replace('.', ',')} €</td>
                                    <td className="px-3 py-2 text-right">
                                      {found
                                        ? <span className="text-green-600 text-xs font-semibold">✓ Trouvée</span>
                                        : <span className="text-red-400 text-xs font-semibold">Introuvable</span>
                                      }
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                    <div className="flex gap-3">
                      <button onClick={() => setCsvStep('idle')} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-mid hover:bg-bg transition-colors">
                        Retour
                      </button>
                      <button
                        onClick={handleCsvImport}
                        disabled={csvResult.kind === 'tables' && csvResult.rows.every(r => !tables.some(t => t.number === r.tableNumber))}
                        className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {csvResult.kind === 'menu'
                          ? `Importer ${csvResult.rows.length} articles`
                          : `Importer ${csvResult.rows.filter(r => tables.some(t => t.number === r.tableNumber)).length} tables`
                        }
                      </button>
                    </div>
                  </>
                )}

                {csvStep === 'importing' && (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-muted">Import en cours…</span>
                  </div>
                )}

                {csvStep === 'done' && csvResult && (
                  <>
                    <div className="flex flex-col items-center gap-3 py-6">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">✓</div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-dark">Import réussi !</div>
                        <div className="text-xs text-muted mt-1">
                          {csvResult.kind === 'menu'
                            ? `${csvResult.rows.length} articles importés dans votre menu.`
                            : `${csvResult.rows.filter(r => tables.some(t => t.number === r.tableNumber)).length} tables mises à jour.`
                          }
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setModal(null); setCsvStep('idle') }} className="w-full py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors">
                      Fermer
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="space-y-4 mb-5">
                  {modal.fields.map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                        {f.label}
                      </label>
                      <input
                        type={f.type ?? 'text'}
                        placeholder={f.placeholder}
                        value={fields[f.key] ?? ''}
                        onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-mono"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-mid hover:bg-bg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConnect}
                    disabled={saving || !modal.fields.every(f => fields[f.key]?.trim())}
                    className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saved ? (
                      <><span className="text-base">✓</span> Connecté</>
                    ) : saving ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Connexion…</>
                    ) : (
                      'Connecter'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function PosCard({ pos, connected, onClick }: { pos: PosIntegration; connected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-4 flex flex-col gap-2.5 transition-all ${
        pos.status === 'soon'
          ? 'border-border bg-bg opacity-60 cursor-not-allowed'
          : connected
          ? 'border-green-200 bg-green-50 cursor-pointer hover:border-green-300'
          : 'border-border bg-white cursor-pointer hover:border-brand/30 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0"
            style={{ backgroundColor: pos.status === 'soon' ? '#94A3B8' : pos.logoColor }}
          >
            {pos.logoText}
          </div>
          <span className="text-sm font-bold text-dark leading-tight">{pos.name}</span>
        </div>
        {connected && (
          <div className="w-2 h-2 rounded-full bg-green-500 mt-1 shrink-0" />
        )}
      </div>
      <p className="text-xs text-muted leading-relaxed line-clamp-2">{pos.description}</p>
      <div className="flex items-center justify-between gap-2 mt-auto">
        {pos.badge && (
          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${pos.badgeStyle}`}>
            {pos.badge}
          </span>
        )}
        <span className={`ml-auto text-xs font-semibold ${
          connected ? 'text-green-700'
          : pos.status === 'soon' ? 'text-gray-400'
          : 'text-brand'
        }`}>
          {connected ? '✓ Connecté' : pos.status === 'soon' ? 'Bientôt' : pos.id === 'csv' ? 'Importer →' : 'Connecter →'}
        </span>
      </div>
    </div>
  )
}

const QR_COLOR_SWATCHES = [
  { label: 'Noir',    value: '#0A0A0A' },
  { label: 'Orange',  value: '#E8920A' },
  { label: 'Bleu',    value: '#2563EB' },
  { label: 'Vert',    value: '#16A34A' },
  { label: 'Rouge',   value: '#DC2626' },
  { label: 'Violet',  value: '#7C3AED' },
]

function QRCodesSection({
  tables, restaurantSlug, restaurantId,
}: {
  tables: { number: number; capacity: number }[]
  restaurantSlug: string
  restaurantId: Id<'restaurants'> | null
}) {
  const restaurant = useRestaurant()
  const updateQrColor = useMutation(api.restaurants.updateQrColor)

  const [qrColor, setQrColor] = useState(restaurant?.qrColor ?? '#0A0A0A')
  const [savedColor, setSavedColor] = useState(false)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  function downloadSVG(tableNumber: number) {
    const svgEl = document.getElementById(`qr-table-${tableNumber}`)
    if (!svgEl) return
    const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-table-${tableNumber}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSaveColor() {
    if (!restaurantId) return
    await updateQrColor({ id: restaurantId, qrColor }).catch(() => {})
    setSavedColor(true)
    setTimeout(() => setSavedColor(false), 2000)
  }

  if (tables.length === 0) {
    return (
      <div
        className="ds-panel p-12 text-center"
        style={{ color: 'var(--ds-text-tertiary)' }}
      >
        <div className="text-[13.5px] font-semibold ds-text-primary mt-3">Aucune table configurée</div>
        <div className="text-[12px] ds-text-tertiary mt-1">Vos QR codes apparaîtront ici.</div>
      </div>
    )
  }

  const previewUrl = `${baseUrl}/t/${restaurantSlug}/1`

  return (
    <div className="space-y-5">

      {/* Color customization */}
      <div className="ds-panel">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
          <div>
            <div className="font-bold text-[13.5px] ds-text-primary">Personnalisation</div>
            <div className="text-[12px] ds-text-tertiary mt-0.5">Couleur du QR code</div>
          </div>
          <button
            onClick={handleSaveColor}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-white transition-colors"
            style={{ background: savedColor ? 'var(--ds-success)' : '#E8920A' }}
          >
            {savedColor ? <><Check size={13} />Enregistré</> : 'Enregistrer'}
          </button>
        </div>
        <div className="px-5 py-5">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Preview */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="rounded-[14px] flex flex-col items-center justify-center px-4 py-4 gap-3"
                style={{
                  background: 'white',
                  border: '1px solid var(--ds-border)',
                  boxShadow: 'var(--ds-shadow-md)',
                  width: '180px',
                }}
              >
                <div
                  className="text-[8px] font-bold uppercase tracking-[0.08em]"
                  style={{ color: '#E8920A' }}
                >
                  Splitzy
                </div>
                <div className="relative">
                  <QRCodeSVG
                    value={previewUrl}
                    size={120}
                    level="M"
                    fgColor={qrColor}
                    includeMargin={false}
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ pointerEvents: 'none' }}
                  >
                    <div
                      className="rounded-[6px] flex items-center justify-center"
                      style={{ background: 'white', padding: '3px', boxShadow: '0 0 0 3px white' }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: '#1A1A1A' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                          <rect x="3" y="5.5" width="6" height="9" rx="1.4" fill="#FFFFFF"/>
                          <rect x="11" y="5.5" width="6" height="9" rx="1.4" fill="#E8920A"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-[8px] font-semibold uppercase tracking-[0.04em]" style={{ color: '#A1A1AA' }}>
                  Table 1
                </div>
              </div>
              <span className="text-[11.5px] ds-text-tertiary">Aperçu live</span>
            </div>

            {/* Swatches + custom */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="text-[12px] font-semibold ds-text-primary mb-2.5">Couleur prédéfinie</div>
                <div className="flex flex-wrap gap-2">
                  {QR_COLOR_SWATCHES.map(swatch => (
                    <button
                      key={swatch.value}
                      onClick={() => setQrColor(swatch.value)}
                      className="w-8 h-8 rounded-[8px] transition-all"
                      title={swatch.label}
                      style={{
                        background: swatch.value,
                        border: '2px solid white',
                        boxShadow: qrColor === swatch.value
                          ? '0 0 0 2px #E8920A'
                          : '0 0 0 1px var(--ds-border)',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[12px] font-semibold ds-text-primary mb-1.5">Couleur personnalisée</div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={qrColor}
                    onChange={e => setQrColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                    style={{ borderColor: 'var(--ds-border)' }}
                  />
                  <input
                    type="text"
                    value={qrColor}
                    onChange={e => setQrColor(e.target.value)}
                    className="w-28 rounded-lg border px-3 py-2 text-[13px] font-mono outline-none"
                    style={{
                      background: 'var(--ds-bg-surface)',
                      borderColor: 'var(--ds-border)',
                      color: 'var(--ds-text-primary)',
                      fontSize: '13px',
                    }}
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR grid */}
      <div className="ds-panel">
        <div className="flex items-center justify-between px-5 py-4 border-b gap-3" style={{ borderColor: 'var(--ds-border)' }}>
          <div>
            <div className="font-bold text-[13.5px] ds-text-primary">QR Codes de vos tables</div>
            <div className="text-[12px] ds-text-tertiary mt-0.5">
              Chaque QR code ouvre directement la page de paiement.
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg border text-[12.5px] font-medium transition-colors shrink-0"
            style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
          >
            <Download size={13} />
            Pack imprimable
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
          {tables.map(table => {
            const url = `${baseUrl}/t/${restaurantSlug}/${table.number}`
            return (
              <div
                key={table.number}
                className="flex flex-col items-center gap-2.5 rounded-xl p-4 border transition-colors hover:ds-bg-subtle"
                style={{ borderColor: 'var(--ds-border)' }}
              >
                <div className="text-[13px] font-semibold ds-text-primary">Table {table.number}</div>
                <a href={url} target="_blank" rel="noreferrer" className="p-2 rounded-lg border transition-colors relative block" style={{ background: 'white', borderColor: 'var(--ds-border)' }}>
                  <QRCodeSVG
                    id={`qr-table-${table.number}`}
                    value={url}
                    size={100}
                    level="H"
                    fgColor={qrColor}
                    includeMargin={false}
                  />
                  {/* Splitzy logo overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="rounded-[5px] flex items-center justify-center gap-[2px]" style={{ background: 'white', padding: '3px', boxShadow: '0 0 0 2px white' }}>
                      <div className="w-[7px] h-[14px] rounded-[2px]" style={{ background: '#1A1A1A' }} />
                      <div className="w-[7px] h-[14px] rounded-[2px]" style={{ background: '#E8920A' }} />
                    </div>
                  </div>
                </a>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] ds-text-accent underline text-center break-all px-1"
                >
                  Tester le lien →
                </a>
                <button
                  onClick={() => downloadSVG(table.number)}
                  className="flex items-center gap-1 text-[11px] font-semibold ds-text-tertiary hover:ds-text-primary transition-colors"
                >
                  <Download size={11} />
                  Télécharger SVG
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const MENU_CATEGORIES = [
  { id: 'entrees',  label: 'Entrées',  emoji: '🥗' },
  { id: 'plats',    label: 'Plats',    emoji: '🍽' },
  { id: 'desserts', label: 'Desserts', emoji: '🍮' },
  { id: 'boissons', label: 'Boissons', emoji: '🥤' },
]

type EditItem = { _id: string; name: string; category: string; priceCents: number; emoji: string; description: string }
type AddItem  = { name: string; category: string; priceCents: number; emoji: string; description: string }

function MenuSection({ restaurantId }: { restaurantId: Id<'restaurants'> | null }) {
  const rawItems = useQuery(api.menuItems.listByRestaurant, restaurantId ? { restaurantId } : 'skip')
  const updateItem = useMutation(api.menuItems.updateItem)
  const deleteItem = useMutation(api.menuItems.deleteItem)
  const addItem    = useMutation(api.menuItems.addItem)
  const syncFromSquare = useAction(api.menuItems.syncFromSquare)

  const squareIntegration = useQuery(
    api.posIntegrations.getByProvider,
    restaurantId ? { restaurantId, provider: 'square' } : 'skip'
  )

  const [activeTab, setActiveTab] = useState('plats')
  const [editing, setEditing]     = useState<EditItem | null>(null)
  const [adding, setAdding]       = useState(false)
  const [newItem, setNewItem]     = useState<AddItem>({ name: '', category: 'plats', priceCents: 0, emoji: '🍽', description: '' })
  const [saving, setSaving]       = useState(false)
  const [syncing, setSyncing]     = useState(false)
  const [toast, setToast]         = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSquareSync() {
    if (!restaurantId || syncing) return
    setSyncing(true)
    try {
      const result = await syncFromSquare({ restaurantId })
      showToast('success', `${result.count} article${result.count !== 1 ? 's' : ''} importés depuis Square ✓`)
    } catch {
      showToast('error', 'Erreur de connexion Square')
    } finally {
      setSyncing(false)
    }
  }

  const items = rawItems ?? []
  const tabItems = items.filter(i => i.category === activeTab)

  // auto-assign emoji when name changes in add form
  function handleNewNameChange(name: string) {
    setNewItem(prev => ({ ...prev, name, emoji: assignEmoji(name, prev.category) }))
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSaving(true)
    await updateItem({
      id: editing._id as Id<'menuItems'>,
      name: editing.name,
      category: editing.category,
      priceCents: editing.priceCents,
      emoji: editing.emoji,
      description: editing.description || undefined,
    })
    setSaving(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    await deleteItem({ id: id as Id<'menuItems'> })
  }

  async function handleAdd() {
    if (!restaurantId || !newItem.name.trim()) return
    setSaving(true)
    await addItem({ restaurantId, ...newItem, description: newItem.description || undefined })
    setSaving(false)
    setAdding(false)
    setNewItem({ name: '', category: activeTab, priceCents: 0, emoji: '🍽', description: '' })
  }

  if (rawItems === undefined) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-card p-12 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 transition-all ${
          toast.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}
      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-dark">Votre menu</h2>
            <p className="text-xs text-muted mt-0.5">{items.length} article{items.length !== 1 ? 's' : ''} · importez via CSV ou ajoutez manuellement</p>
          </div>
          <div className="flex items-center gap-2">
            {squareIntegration && (
              <button
                onClick={handleSquareSync}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#18181B] text-[#18181B] text-xs font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {syncing ? (
                  <><div className="w-3 h-3 border-2 border-[#18181B] border-t-transparent rounded-full animate-spin" /> Synchronisation...</>
                ) : (
                  <><span className="text-[11px] font-black bg-[#18181B] text-white rounded px-1 py-px">SQ</span> Synchroniser depuis Square</>
                )}
              </button>
            )}
            <button
              onClick={() => { setAdding(true); setNewItem({ name: '', category: activeTab, priceCents: 0, emoji: '🍽', description: '' }) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-dark transition-colors"
            >
              + Ajouter
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 mb-5 border-b border-border">
          {MENU_CATEGORIES.map(cat => {
            const count = items.filter(i => i.category === cat.id).length
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  activeTab === cat.id ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-dark'
                }`}
              >
                {cat.emoji} {cat.label}
                <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${activeTab === cat.id ? 'bg-brand-bg text-brand' : 'bg-bg text-muted'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Items list */}
        {tabItems.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-2">{MENU_CATEGORIES.find(c => c.id === activeTab)?.emoji}</div>
            <div className="text-sm font-semibold text-dark">Aucun article dans cette catégorie</div>
            <div className="text-xs text-muted mt-1">Importez un CSV ou cliquez sur "+ Ajouter"</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tabItems.map(item => (
              <div key={item._id} className="flex items-center gap-3 py-3">
                <span className="text-xl w-7 text-center shrink-0">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-dark truncate">{item.name}</div>
                  {item.description && <div className="text-xs text-muted truncate">{item.description}</div>}
                </div>
                <span className="text-sm font-bold text-dark shrink-0">
                  {(item.priceCents / 100).toFixed(2).replace('.', ',')} €
                </span>
                <button
                  onClick={() => setEditing({ _id: item._id, name: item.name, category: item.category, priceCents: item.priceCents, emoji: item.emoji, description: item.description ?? '' })}
                  className="text-xs text-muted hover:text-brand transition-colors shrink-0 px-2 py-1 rounded hover:bg-brand-bg"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="text-xs text-muted hover:text-red-500 transition-colors shrink-0 px-2 py-1 rounded hover:bg-red-50"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-dark mb-4">Modifier l'article</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Emoji</label>
                  <input
                    type="text"
                    value={editing.emoji}
                    onChange={e => setEditing(prev => prev && ({ ...prev, emoji: e.target.value }))}
                    className="w-14 border border-border rounded-lg px-2 py-2.5 text-lg text-center focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Nom</label>
                  <input
                    type="text"
                    value={editing.name}
                    onChange={e => setEditing(prev => prev && ({ ...prev, name: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Prix (€)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={(editing.priceCents / 100).toFixed(2)}
                    onChange={e => setEditing(prev => prev && ({ ...prev, priceCents: Math.round(parseFloat(e.target.value) * 100) || 0 }))}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Catégorie</label>
                  <select
                    value={editing.category}
                    onChange={e => setEditing(prev => prev && ({ ...prev, category: e.target.value }))}
                    className="w-full border border-border rounded-lg px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    {MENU_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Description</label>
                <input
                  type="text"
                  value={editing.description}
                  onChange={e => setEditing(prev => prev && ({ ...prev, description: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-mid hover:bg-bg transition-colors">Annuler</button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setAdding(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-dark mb-4">Ajouter un article</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Emoji</label>
                  <input
                    type="text"
                    value={newItem.emoji}
                    onChange={e => setNewItem(prev => ({ ...prev, emoji: e.target.value }))}
                    className="w-14 border border-border rounded-lg px-2 py-2.5 text-lg text-center focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Nom</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={e => handleNewNameChange(e.target.value)}
                    placeholder="Ex: Entrecôte Bordelaise"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Prix (€)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newItem.priceCents > 0 ? (newItem.priceCents / 100).toFixed(2) : ''}
                    onChange={e => setNewItem(prev => ({ ...prev, priceCents: Math.round(parseFloat(e.target.value) * 100) || 0 }))}
                    placeholder="0.00"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Catégorie</label>
                  <select
                    value={newItem.category}
                    onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value, emoji: assignEmoji(prev.name, e.target.value) }))}
                    className="w-full border border-border rounded-lg px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    {MENU_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Description</label>
                <input
                  type="text"
                  value={newItem.description}
                  onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setAdding(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-mid hover:bg-bg transition-colors">Annuler</button>
              <button
                onClick={handleAdd}
                disabled={saving || !newItem.name.trim() || newItem.priceCents <= 0}
                className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    priceLabel: 'Gratuit',
    desc: 'Pour tester Splitzy',
    features: ['Jusqu\'à 5 tables', '100 paiements / mois', 'QR codes inclus', 'Support par email'],
    missing: ['Intégrations POS', 'Analytics avancés', 'Multi-établissements'],
    cta: 'Plan actuel',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceLabel: '29 € / mois',
    desc: 'Pour les restaurants actifs',
    features: ['Tables illimitées', 'Paiements illimités', 'Toutes les intégrations POS', 'Analytics complets', 'Export CSV & PDF', 'Support prioritaire'],
    missing: ['Multi-établissements'],
    cta: 'Passer au Pro',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Entreprise',
    price: null,
    priceLabel: 'Sur devis',
    desc: 'Pour les groupes & chaînes',
    features: ['Multi-établissements', 'Tableau de bord unifié', 'API & webhooks', 'Intégration comptable', 'Manager dédié', 'SLA garanti'],
    missing: [],
    cta: 'Nous contacter',
    highlight: false,
  },
]

// Aucune facture d'abonnement émise (billing pas encore branché). Quand le
// billing réel arrivera : query Convex — ne jamais remettre de fausses
// factures ici, elles étaient affichées et téléchargeables comme réelles.
const SUBSCRIPTION_INVOICES: { id: string; date: string; amountCents: number; plan: string; status: string }[] = []

function formatEurCents(cents: number) {
  if (cents === 0) return '0,00 €'
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function BillingSection({ restaurant }: { restaurant: ReturnType<typeof useRestaurant> }) {
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const restaurantId = useRestaurantId()
  const setSuspended = useMutation(api.restaurants.setSuspended)
  const deleteAll    = useMutation(api.restaurants.deleteAll)

  const currentPlan = restaurant?.plan ?? 'essentiel'
  const PLAN_LABELS: Record<string, string> = {
    gratuit: 'Plan Gratuit', starter: 'Plan Starter',
    essentiel: 'Plan Essentiel', pro: 'Plan Pro',
  }
  const currentPlanLabel = PLAN_LABELS[currentPlan] ?? 'Plan Essentiel'
  const [billingForm, setBillingForm] = useState({
    company: restaurant?.name ?? '',
    address: restaurant?.address ?? '',
    vatNumber: '',
    email: restaurant?.email ?? '',
  })
  const [savedBilling, setSavedBilling] = useState(false)
  const [showPlans, setShowPlans] = useState(false)

  const [ibanForm, setIbanForm] = useState({ holder: '', iban: '' })
  const [savedIban, setSavedIban] = useState<{ holder: string; iban: string } | null>(null)
  const [showIbanForm, setShowIbanForm] = useState(false)
  const [ibanSaved, setIbanSaved] = useState(false)

  function handleSaveIban() {
    if (!ibanForm.holder.trim() || !ibanForm.iban.trim()) return
    setSavedIban({ holder: ibanForm.holder.trim(), iban: ibanForm.iban.trim().toUpperCase() })
    setShowIbanForm(false)
    setIbanSaved(true)
    setTimeout(() => setIbanSaved(false), 2500)
  }

  function maskIban(iban: string) {
    const clean = iban.replace(/\s/g, '')
    if (clean.length < 8) return iban
    return clean.slice(0, 4) + ' •••• •••• •••• ' + clean.slice(-4)
  }

  // Danger zone modals
  const [suspendModal, setSuspendModal] = useState(false)
  const [deleteModal,  setDeleteModal]  = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [dangerLoading, setDangerLoading] = useState(false)

  const isSuspended = restaurant?.suspended ?? false

  async function handleSuspend() {
    if (!restaurantId) return
    setDangerLoading(true)
    await setSuspended({ id: restaurantId, suspended: !isSuspended })
    setDangerLoading(false)
    setSuspendModal(false)
  }

  async function handleDelete() {
    if (!restaurantId || deleteConfirm.trim().toLowerCase() !== restaurant?.name.toLowerCase()) return
    setDangerLoading(true)
    await deleteAll({ id: restaurantId })
    await signOut()
    navigate('/restaurant/sign-in', { replace: true })
  }

  function handleSaveBilling() {
    setSavedBilling(true)
    setTimeout(() => setSavedBilling(false), 2000)
  }

  return (
    <div className="space-y-5">

      {/* Current plan banner */}
      <div className="ds-panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-[15px] ds-text-primary">{currentPlanLabel}</span>
              <span
                className="text-[11px] font-semibold rounded-full px-2 py-0.5"
                style={{ background: 'var(--ds-accent-soft)', color: 'var(--ds-accent-strong)' }}
              >
                Actuel
              </span>
            </div>
            <p className="text-[12.5px] ds-text-tertiary">
              {currentPlan === 'pro' ? 'Tables illimitées · Paiements illimités · Support prioritaire'
                : currentPlan === 'essentiel' ? "Jusqu'à 20 tables · Paiements illimités · Analytics"
                : "Jusqu'à 5 tables · 50 paiements / mois · QR codes inclus"}
            </p>
          </div>
          <button
            onClick={() => setShowPlans(v => !v)}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors"
            style={{ background: '#E8920A' }}
          >
            {showPlans ? 'Fermer' : 'Changer de plan'}
          </button>
        </div>
      </div>

      {/* Plans comparison */}
      {showPlans && (
        <div className="bg-white rounded-xl border border-border shadow-card p-6">
          <h3 className="text-base font-bold text-dark mb-5">Choisir un plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`rounded-xl border-2 p-5 flex flex-col gap-4 relative ${
                  plan.highlight
                    ? 'border-brand bg-brand-bg/30'
                    : currentPlan === plan.id
                    ? 'border-gray-200 bg-bg'
                    : 'border-border bg-white'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-brand text-white text-[10px] font-bold rounded-full px-3 py-1 whitespace-nowrap">
                      ✦ Recommandé
                    </span>
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-dark">{plan.name}</div>
                  <div className="text-xl font-black text-dark mt-1">{plan.priceLabel}</div>
                  <div className="text-xs text-muted mt-0.5">{plan.desc}</div>
                </div>
                <div className="space-y-1.5 flex-1">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-1.5 text-xs text-dark">
                      <span className="text-green-500 shrink-0 mt-px">✓</span> {f}
                    </div>
                  ))}
                  {plan.missing.map(f => (
                    <div key={f} className="flex items-start gap-1.5 text-xs text-muted line-through">
                      <span className="shrink-0 mt-px">✕</span> {f}
                    </div>
                  ))}
                </div>
                <button
                  disabled={currentPlan === plan.id}
                  className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                    currentPlan === plan.id
                      ? 'bg-bg text-muted cursor-not-allowed border border-border'
                      : plan.highlight
                      ? 'bg-brand text-white hover:bg-brand-dark'
                      : 'bg-white text-dark border border-border hover:bg-bg'
                  }`}
                >
                  {currentPlan === plan.id ? 'Plan actuel' : plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing info */}
      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        <h3 className="text-base font-bold text-dark mb-5">Informations de facturation</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Raison sociale</label>
            <input
              type="text"
              value={billingForm.company}
              onChange={e => setBillingForm(p => ({ ...p, company: e.target.value }))}
              placeholder="Nom de votre société"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Adresse de facturation</label>
            <input
              type="text"
              value={billingForm.address}
              onChange={e => setBillingForm(p => ({ ...p, address: e.target.value }))}
              placeholder="12 rue de la Paix, 75001 Paris"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">N° TVA intracommunautaire</label>
            <input
              type="text"
              value={billingForm.vatNumber}
              onChange={e => setBillingForm(p => ({ ...p, vatNumber: e.target.value }))}
              placeholder="FR12345678901"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Email de facturation</label>
            <input
              type="email"
              value={billingForm.email}
              onChange={e => setBillingForm(p => ({ ...p, email: e.target.value }))}
              placeholder="compta@monrestaurant.fr"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
        </div>
        <div className="flex justify-end mt-5">
          <button
            onClick={handleSaveBilling}
            className="px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors flex items-center gap-2"
          >
            {savedBilling ? <><span>✓</span> Enregistré</> : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Payment method — SEPA direct debit */}
      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-dark">Moyen de paiement</h3>
          {ibanSaved && <span className="text-xs font-semibold text-green-600">✓ Enregistré</span>}
        </div>
        <p className="text-xs text-muted mb-5">Prélèvement automatique SEPA — votre abonnement sera débité sur ce compte.</p>

        {savedIban && !showIbanForm ? (
          <div className="flex items-center gap-4 p-4 border border-border rounded-xl bg-bg">
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <span className="text-base">🏦</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-dark">{savedIban.holder}</div>
              <div className="text-xs text-muted font-mono mt-0.5">{maskIban(savedIban.iban)}</div>
            </div>
            <span className="text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 shrink-0">Actif</span>
            <button
              onClick={() => { setIbanForm({ holder: savedIban.holder, iban: savedIban.iban }); setShowIbanForm(true) }}
              className="text-xs text-brand hover:underline shrink-0"
            >
              Modifier
            </button>
            <button
              onClick={() => { setSavedIban(null); setIbanForm({ holder: '', iban: '' }) }}
              className="text-xs text-muted hover:text-red-500 transition-colors shrink-0"
            >
              Supprimer
            </button>
          </div>
        ) : (
          !showIbanForm ? (
            <button
              onClick={() => setShowIbanForm(true)}
              className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-lg">+</span> Ajouter un IBAN
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Titulaire du compte</label>
                <input
                  type="text"
                  value={ibanForm.holder}
                  onChange={e => setIbanForm(p => ({ ...p, holder: e.target.value }))}
                  placeholder="Nom complet ou raison sociale"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">IBAN</label>
                <input
                  type="text"
                  value={ibanForm.iban}
                  onChange={e => setIbanForm(p => ({ ...p, iban: e.target.value }))}
                  placeholder="FR76 3000 6000 0112 3456 7890 189"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-dark font-mono focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
                <p className="text-[11px] text-muted mt-1">Format SEPA — France (FR), Belgique (BE), Suisse (CH)…</p>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <span className="text-sm">🔒</span>
                <p className="text-xs text-blue-700">Vos informations bancaires sont chiffrées et ne sont jamais stockées en clair.</p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowIbanForm(false); setIbanForm({ holder: savedIban?.holder ?? '', iban: savedIban?.iban ?? '' }) }}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-muted hover:bg-bg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveIban}
                  disabled={!ibanForm.holder.trim() || !ibanForm.iban.trim()}
                  className="px-5 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Enregistrer le mandat
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Invoice history */}
      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-dark">Historique des factures</h3>
          {SUBSCRIPTION_INVOICES.length > 0 && (
          <button
            onClick={() => downloadAllInvoices(SUBSCRIPTION_INVOICES.map(inv => ({
              id: inv.id,
              date: inv.date,
              plan: inv.plan,
              amountTTC: inv.amountCents,
              status: inv.status,
              restaurant: { name: restaurant?.name ?? '', address: restaurant?.address ?? '', email: restaurant?.email ?? '' },
              billing: billingForm,
            })))}
            className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
          >
            <Download size={12} /> Tout télécharger
          </button>
          )}
        </div>
        <div className="divide-y divide-border">
          {SUBSCRIPTION_INVOICES.length === 0 && (
            <div className="py-8 text-center text-xs text-muted">
              Aucune facture pour le moment — vos factures d'abonnement apparaîtront ici.
            </div>
          )}
          {SUBSCRIPTION_INVOICES.map(inv => {
            const invoiceData: BillingInvoiceData = {
              id: inv.id,
              date: inv.date,
              plan: inv.plan,
              amountTTC: inv.amountCents,
              status: inv.status,
              restaurant: { name: restaurant?.name ?? '', address: restaurant?.address ?? '', email: restaurant?.email ?? '' },
              billing: billingForm,
            }
            return (
              <div key={inv.id} className="flex items-center gap-4 py-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-dark">{inv.id}</div>
                  <div className="text-xs text-muted">{inv.date} · Plan {inv.plan}</div>
                </div>
                <span className="text-sm font-semibold text-dark">{formatEurCents(inv.amountCents)}</span>
                <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border ${
                  inv.status === 'Payée'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}>
                  {inv.status}
                </span>
                <button
                  onClick={() => generateBillingInvoicePDF(invoiceData)}
                  className="text-xs text-muted hover:text-brand transition-colors px-2 py-1 rounded hover:bg-brand-bg flex items-center gap-1"
                >
                  <Download size={11} /> PDF
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-200 shadow-card p-6">
        <h3 className="text-base font-bold text-red-600 mb-1">Zone de danger</h3>
        <p className="text-xs text-muted mb-4">Ces actions affectent votre compte. Procédez avec précaution.</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <div className="text-sm font-semibold text-dark">
                {isSuspended ? 'Réactiver mon compte' : 'Suspendre mon compte'}
              </div>
              <div className="text-xs text-muted">
                {isSuspended
                  ? 'Les QR codes seront de nouveau actifs pour vos clients.'
                  : 'Les QR codes affichent "restaurant fermé". Votre dashboard reste accessible.'}
              </div>
            </div>
            {isSuspended && (
              <span className="text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5 mr-3">
                Suspendu
              </span>
            )}
            <button
              onClick={() => setSuspendModal(true)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                isSuspended
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'border-border text-mid hover:border-red-200 hover:text-red-600'
              }`}
            >
              {isSuspended ? 'Réactiver' : 'Suspendre'}
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-semibold text-red-600">Supprimer mon compte</div>
              <div className="text-xs text-muted">Toutes vos données seront effacées définitivement.</div>
            </div>
            <button
              onClick={() => { setDeleteModal(true); setDeleteConfirm('') }}
              className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {/* Suspend confirmation modal */}
      {suspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSuspendModal(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-3 text-center">{isSuspended ? '✅' : '⏸'}</div>
            <h3 className="text-base font-bold text-dark text-center mb-2">
              {isSuspended ? 'Réactiver le compte ?' : 'Suspendre le compte ?'}
            </h3>
            <p className="text-sm text-muted text-center mb-6">
              {isSuspended
                ? 'Vos QR codes seront de nouveau actifs. Vos clients pourront payer depuis leur table.'
                : 'Les QR codes afficheront un message de fermeture. Vous pourrez réactiver à tout moment.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSuspendModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-mid hover:bg-bg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSuspend}
                disabled={dangerLoading}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  isSuspended
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {dangerLoading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : isSuspended ? 'Réactiver' : 'Suspendre'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteModal(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-3 text-center">🗑️</div>
            <h3 className="text-base font-bold text-red-600 text-center mb-2">Supprimer le compte ?</h3>
            <p className="text-sm text-muted text-center mb-5">
              Cette action est <strong className="text-dark">irréversible</strong>. Toutes vos tables, paiements, feedbacks et votre menu seront effacés.
            </p>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Tapez <strong className="text-dark">{restaurant?.name}</strong> pour confirmer
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={restaurant?.name ?? ''}
                className="w-full border border-red-200 rounded-lg px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-mid hover:bg-bg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={dangerLoading || deleteConfirm.trim().toLowerCase() !== restaurant?.name.toLowerCase()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {dangerLoading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Supprimer définitivement'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{ height: '22px', width: '40px' }}
      className={`relative rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-gray-200'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

// ══════════════════════════════════════════════════════════════
// TEAM SECTION
// ══════════════════════════════════════════════════════════════

type MemberRole = 'owner' | 'manager' | 'staff'

const ROLE_STYLE: Record<MemberRole, { bg: string; color: string; label: string }> = {
  owner:   { bg: 'var(--ds-accent-soft)',   color: 'var(--ds-accent)',         label: 'Propriétaire' },
  manager: { bg: '#EFF6FF',                 color: '#2563EB',                  label: 'Manager' },
  staff:   { bg: 'var(--ds-bg-subtle)',     color: 'var(--ds-text-secondary)', label: 'Équipier' },
}

// Rôles proposés à l'invitation (table restaurantInvitations). Mappés vers
// owner/manager/staff côté backend à l'acceptation (convex/invitations.ts).
type InviteRole = 'gerant' | 'manager' | 'viewer'

const INVITE_ROLES: { id: InviteRole; label: string; desc: string }[] = [
  { id: 'gerant',  label: 'Gérant',  desc: 'Accès complet : paramètres, équipe, facturation.' },
  { id: 'manager', label: 'Manager', desc: 'Dashboard opérationnel : tables, feedbacks, analytics.' },
  { id: 'viewer',  label: 'Viewer',  desc: 'Lecture seule des tables et feedbacks du jour.' },
]

const INVITE_ROLE_LABEL: Record<string, string> = {
  gerant: 'Gérant', manager: 'Manager', viewer: 'Viewer',
}

// Badge de statut d'une invitation. 'expired' est calculé aussi quand
// expiresAt est dépassé même si le statut stocké est encore 'pending'.
const INVITE_STATUS_STYLE: Record<'pending' | 'accepted' | 'expired', { bg: string; color: string; label: string }> = {
  pending:  { bg: 'var(--ds-warning-soft)', color: 'var(--ds-warning)',        label: 'En attente' },
  accepted: { bg: 'var(--ds-success-soft)', color: 'var(--ds-success-strong)', label: 'Acceptée' },
  expired:  { bg: 'var(--ds-bg-subtle)',    color: 'var(--ds-text-tertiary)',  label: 'Expirée' },
}

// Compétences possibles d'un extra. `id` stocké en base (extras.skills), `label`
// affiché dans les badges des cartes et les checkboxes du formulaire.
const EXTRA_SKILLS: { id: string; label: string }[] = [
  { id: 'serveur',   label: 'Serveur' },
  { id: 'barman',    label: 'Barman' },
  { id: 'cuisine',   label: 'Cuisine' },
  { id: 'caisse',    label: 'Caisse' },
  { id: 'livraison', label: 'Livraison' },
  { id: 'autre',     label: 'Autre' },
]

const EXTRA_SKILL_LABEL: Record<string, string> = Object.fromEntries(
  EXTRA_SKILLS.map(s => [s.id, s.label]),
)

// Libellé « Dernière convocation » d'une carte extra (relatif, puis date courte).
function formatLastConvocation(ts: number | null): string {
  if (!ts) return 'Jamais convoqué'
  const min = Math.floor((Date.now() - ts) / 60000)
  let rel: string
  if (min < 1) rel = "à l'instant"
  else if (min < 60) rel = `il y a ${min} min`
  else if (min < 1440) rel = `il y a ${Math.floor(min / 60)} h`
  else if (min < 10080) rel = `il y a ${Math.floor(min / 1440)} j`
  else rel = "le " + new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  return `Dernière convocation : ${rel}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Nom affiché d'un membre : prénom + nom (Clerk) si renseignés, sinon le libellé
// `name` (dérivé de l'email à l'invitation), sinon l'email brut en dernier recours.
function memberDisplayName(m: { displayName?: string; firstName?: string; lastName?: string; name?: string; email: string }): string {
  if (m.displayName?.trim()) return m.displayName.trim()
  const full = [m.firstName, m.lastName].filter(Boolean).join(' ').trim()
  return full || m.name?.trim() || m.email
}

function TeamSection({ restaurantId }: { restaurantId: Id<'restaurants'> | null }) {
  const { user } = useUser()
  const restaurant = useRestaurant()
  const restaurantName = restaurant?.name ?? 'votre restaurant'
  const members = useQuery(api.members.getTeamMembers, restaurantId ? { restaurantId } : 'skip') ?? []
  const syncMemberProfile = useMutation(api.members.syncMyProfile)

  // Backfill : recopie le nom Clerk de l'utilisateur courant sur sa propre ligne
  // `members` à l'ouverture de la page, pour les membres créés avant l'ajout des
  // champs firstName/lastName (sans-effet pour le propriétaire, qui n'a pas de ligne).
  useEffect(() => {
    if (!user) return
    syncMemberProfile({
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
    }).catch(() => {})
  }, [user, syncMemberProfile])
  const invitations = useQuery(api.invitations.listByRestaurant, restaurantId ? { restaurantId } : 'skip') ?? []
  const createInvitation = useAction(api.invitations.create)
  const updateMemberRole = useMutation(api.members.updateMemberRole)
  const removeMember     = useMutation(api.members.removeMember)
  const updateDisplayName = useMutation(api.members.updateDisplayName)
  const [editingName, setEditingName] = useState<{ id: Id<'members'>; value: string } | null>(null)

  const [showInvite, setShowInvite] = useState(false)
  const [showRoles, setShowRoles] = useState(false)
  const [inviteForm, setInviteForm] = useState<{ email: string; role: InviteRole }>({ email: '', role: 'manager' })
  const [inviting, setInviting] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<{ id: Id<'members'>; name: string } | null>(null)
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    if (!confirmRemove) return
    setRemoving(true)
    try {
      await removeMember({ memberId: confirmRemove.id })
      toast.success(`${confirmRemove.name} retiré(e) de l'équipe`)
      setConfirmRemove(null)
    } catch {
      toast.error('Échec de la suppression')
    } finally {
      setRemoving(false)
    }
  }

  async function handleInvite() {
    const email = inviteForm.email.trim()
    if (!restaurantId || !EMAIL_RE.test(email)) {
      toast.error('Adresse email invalide')
      return
    }
    setInviting(true)
    try {
      const res = await createInvitation({ restaurantId, email, role: inviteForm.role, restaurantName })
      if (res?.emailSent) {
        toast.success(`Invitation envoyée à ${email}`)
      } else {
        toast.success(`Invitation créée pour ${email}`, {
          description: "L'email n'a pas pu être envoyé — vérifiez la configuration Resend.",
        })
      }
      setShowInvite(false)
      setInviteForm({ email: '', role: 'manager' })
    } catch {
      toast.error("Échec de l'envoi de l'invitation")
    } finally {
      setInviting(false)
    }
  }

  async function handleResend(inv: { _id: string; email: string; role: string }) {
    if (!restaurantId || resendingId) return
    setResendingId(inv._id)
    try {
      const res = await createInvitation({
        restaurantId,
        email: inv.email,
        role: inv.role,
        restaurantName,
      })
      toast.success(
        res?.emailSent ? `Invitation renvoyée à ${inv.email}` : `Nouvelle invitation créée pour ${inv.email}`
      )
    } catch {
      toast.error('Échec du renvoi')
    } finally {
      setResendingId(null)
    }
  }

  // Synthetic owner row from Clerk user (always shown first)
  const ownerName  = user
    ? `${user.firstName ?? ''}${user.lastName ? ' ' + user.lastName : ''}`.trim() || 'Gérant'
    : 'Gérant'
  const ownerEmail = user?.emailAddresses[0]?.emailAddress ?? ''
  const ownerInitials = ownerName.split(' ').map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')

  const pendingCount = members.filter(m => m.status === 'pending').length

  // Invitations acceptées sans ligne `members` correspondante (l'invité a cliqué
  // le lien mais n'a pas encore de membre en base — typiquement pas encore
  // reconnecté avec son clerkUserId). On les affiche dans la liste membres comme
  // « En attente de connexion » pour qu'elles ne disparaissent pas de la vue.
  const orphanAccepted = invitations.filter(
    inv =>
      inv.status === 'accepted' &&
      !members.some(m => m.email.toLowerCase() === inv.email.toLowerCase())
  )

  // Initiales d'avatar dérivées de l'email (ex: grg.yann@… → « GY »).
  function emailInitials(email: string): string {
    const local = (email.split('@')[0] ?? '').replace(/[._-]+/g, ' ').trim()
    const ini = local.split(' ').filter(Boolean).map(p => p[0]?.toUpperCase() ?? '').slice(0, 2).join('')
    return ini || email.slice(0, 2).toUpperCase()
  }

  // Rôle d'invitation (gerant/manager/viewer) → style ROLE_STYLE (owner/manager/staff).
  function inviteRoleStyle(role: string) {
    return ROLE_STYLE[role === 'gerant' ? 'owner' : role === 'viewer' ? 'staff' : 'manager']
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            className="font-extrabold tracking-[-0.03em]"
            style={{ fontSize: '24px', color: 'var(--ds-text-primary)' }}
          >
            Équipe
          </h2>
          <p className="text-[13.5px] mt-1.5 max-w-lg" style={{ color: 'var(--ds-text-secondary)' }}>
            Gérez les accès de votre équipe au dashboard Splitzy.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowRoles(true)}
            className="px-3 py-[7px] rounded-lg text-[13px] font-medium border transition-colors"
            style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
          >
            Comprendre les rôles
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[13px] font-semibold text-white"
            style={{ background: '#E8920A' }}
          >
            <Plus size={14} />
            Inviter un membre
          </button>
        </div>
      </div>

      {/* Members table — overflow visible pour que le menu "⋯" ne soit pas clippé par .ds-panel */}
      <div className="ds-panel" style={{ overflow: 'visible' }}>
        {/* Header row */}
        <div
          className="grid gap-3.5 px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.07em]"
          style={{
            gridTemplateColumns: '36px 1.5fr 1fr 100px 90px 40px',
            background: 'var(--ds-bg-subtle)',
            color: 'var(--ds-text-tertiary)',
            borderBottom: '1px solid var(--ds-border)',
          }}
        >
          <div />
          <div>Membre</div>
          <div>Email</div>
          <div>Rôle</div>
          <div>Statut</div>
          <div />
        </div>

        <div>
          {/* Owner row (always visible — current Clerk user) */}
          <div
            className="grid gap-3.5 px-5 py-3 border-b items-center"
            style={{ gridTemplateColumns: '36px 1.5fr 1fr 100px 90px 40px', borderColor: 'var(--ds-border)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11.5px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #FFB453, #E8920A)' }}
            >
              {ownerInitials}
            </div>
            <div>
              <div className="text-[13px] font-semibold ds-text-primary">{ownerName}</div>
            </div>
            <div className="text-[11.5px] ds-text-tertiary truncate">{ownerEmail}</div>
            <div>
              <span
                className="inline-flex items-center px-2 py-[3px] rounded-full text-[11px] font-semibold"
                style={{ background: ROLE_STYLE.owner.bg, color: ROLE_STYLE.owner.color }}
              >
                {ROLE_STYLE.owner.label}
              </span>
            </div>
            <div>
              <span
                className="inline-flex items-center px-2 py-[3px] rounded-full text-[11px] font-semibold"
                style={{ background: 'var(--ds-success-soft)', color: 'var(--ds-success-strong)' }}
              >
                Actif
              </span>
            </div>
            <div />
          </div>

          {members.length === 0 && orphanAccepted.length === 0 && (
            <div className="py-8 text-center text-[13px]" style={{ color: 'var(--ds-text-tertiary)' }}>
              Aucun autre membre. Invitez quelqu'un pour commencer.
            </div>
          )}
          {members.map(member => {
              const roleStyle = ROLE_STYLE[member.role as MemberRole] ?? ROLE_STYLE.staff
              const displayName = memberDisplayName(member)
              const initials = displayName.split(' ').map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')
              return (
                <div
                  key={member._id}
                  className="grid gap-3.5 px-5 py-3 border-b items-center transition-colors hover:ds-bg-subtle"
                  style={{
                    gridTemplateColumns: '36px 1.5fr 1fr 100px 90px 40px',
                    borderColor: 'var(--ds-border)',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11.5px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #FFB453, #E8920A)' }}
                  >
                    {initials}
                  </div>
                  {/* Name — cliquer pour renommer (displayName libre) */}
                  <div>
                    {editingName?.id === member._id ? (
                      <input
                        autoFocus
                        className="text-[13px] font-semibold bg-transparent border-b border-[var(--ds-accent)] outline-none w-full max-w-[160px] ds-text-primary"
                        value={editingName.value}
                        maxLength={30}
                        onChange={e => setEditingName(s => s ? { ...s, value: e.target.value } : s)}
                        onBlur={() => {
                          updateDisplayName({ memberId: member._id, displayName: editingName.value }).catch(() => {})
                          setEditingName(null)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                          if (e.key === 'Escape') setEditingName(null)
                        }}
                      />
                    ) : (
                      <div
                        className="text-[13px] font-semibold ds-text-primary cursor-pointer hover:underline"
                        title="Cliquer pour renommer"
                        onClick={() => setEditingName({ id: member._id, value: member.displayName ?? displayName })}
                      >{displayName}</div>
                    )}
                  </div>
                  {/* Email */}
                  <div className="text-[11.5px] ds-text-tertiary truncate">{member.email}</div>
                  {/* Role */}
                  <div>
                    <span
                      className="inline-flex items-center px-2 py-[3px] rounded-full text-[11px] font-semibold"
                      style={{ background: roleStyle.bg, color: roleStyle.color }}
                    >
                      {roleStyle.label}
                    </span>
                  </div>
                  {/* Status */}
                  <div>
                    <span
                      className="inline-flex items-center px-2 py-[3px] rounded-full text-[11px] font-semibold"
                      style={
                        member.status === 'active'
                          ? { background: 'var(--ds-success-soft)', color: 'var(--ds-success-strong)' }
                          : { background: 'var(--ds-warning-soft)', color: 'var(--ds-warning)' }
                      }
                    >
                      {member.status === 'active' ? 'Actif' : 'En attente'}
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === member._id ? null : member._id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:ds-bg-subtle"
                      style={{ color: 'var(--ds-text-tertiary)' }}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {openMenu === member._id && (
                      <div
                        className="absolute right-0 top-9 rounded-[10px] py-1 z-50 min-w-[160px]"
                        style={{
                          background: 'var(--ds-bg-surface)',
                          border: '1px solid var(--ds-border)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        }}
                      >
                        {/* SECURITY (H2) : "owner" non proposé — promotion vers owner interdite côté backend */}
                        {(['manager', 'staff'] as const).map(r => (
                          <button
                            key={r}
                            onClick={() => {
                              updateMemberRole({ memberId: member._id, role: r }).catch(() => {})
                              setOpenMenu(null)
                            }}
                            className="w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] hover:ds-bg-subtle transition-colors"
                            style={{ color: 'var(--ds-text-primary)' }}
                          >
                            {member.role === r && <Check size={13} style={{ color: '#E8920A' }} />}
                            {member.role !== r && <span className="w-[13px]" />}
                            {ROLE_STYLE[r].label}
                          </button>
                        ))}
                        <div className="my-1" style={{ borderTop: '1px solid var(--ds-border)' }} />
                        <button
                          onClick={() => {
                            setConfirmRemove({ id: member._id, name: displayName })
                            setOpenMenu(null)
                          }}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] hover:ds-bg-error-soft transition-colors"
                          style={{ color: 'var(--ds-error)' }}
                        >
                          <Trash2 size={13} />
                          Retirer du restaurant
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

          {/* Invités acceptés sans membre en base — en attente de leur 1ère connexion */}
          {orphanAccepted.map(inv => {
            const roleStyle = inviteRoleStyle(inv.role)
            return (
              <div
                key={inv._id}
                className="grid gap-3.5 px-5 py-3 border-b items-center"
                style={{ gridTemplateColumns: '36px 1.5fr 1fr 100px 90px 40px', borderColor: 'var(--ds-border)' }}
              >
                {/* Avatar (initiales email) */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11.5px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #FFB453, #E8920A)' }}
                >
                  {emailInitials(inv.email)}
                </div>
                {/* Email comme nom */}
                <div>
                  <div className="text-[13px] font-semibold ds-text-primary truncate">{inv.email}</div>
                </div>
                {/* Email */}
                <div className="text-[11.5px] ds-text-tertiary truncate">{inv.email}</div>
                {/* Role */}
                <div>
                  <span
                    className="inline-flex items-center px-2 py-[3px] rounded-full text-[11px] font-semibold"
                    style={{ background: roleStyle.bg, color: roleStyle.color }}
                  >
                    {roleStyle.label}
                  </span>
                </div>
                {/* Status — en attente de connexion */}
                <div>
                  <span
                    className="inline-flex items-center px-2 py-[3px] rounded-full text-[11px] font-semibold whitespace-nowrap"
                    style={{ background: 'var(--ds-warning-soft)', color: 'var(--ds-warning)' }}
                  >
                    En attente de connexion
                  </span>
                </div>
                <div />
              </div>
            )
          })}
        </div>

        {pendingCount > 0 && (
          <div
            className="px-5 py-2.5 text-[12px] font-medium"
            style={{
              background: 'var(--ds-warning-soft)',
              borderTop: '1px solid var(--ds-border)',
              color: 'var(--ds-warning)',
            }}
          >
            {pendingCount} invitation{pendingCount > 1 ? 's' : ''} en attente de confirmation
          </div>
        )}
      </div>

      {/* Invitations list */}
      {invitations.length > 0 && (
        <div className="ds-panel">
          <div className="px-5 py-3.5 border-b" style={{ borderColor: 'var(--ds-border)' }}>
            <div className="font-bold text-[13.5px] ds-text-primary">Invitations</div>
            <div className="text-[12px] ds-text-tertiary mt-0.5">
              Suivi des invitations envoyées par email.
            </div>
          </div>
          <div>
            {invitations.map(inv => {
              const effectiveStatus: 'pending' | 'accepted' | 'expired' =
                inv.status === 'accepted'
                  ? 'accepted'
                  : inv.status === 'expired' || inv.expiresAt < Date.now()
                  ? 'expired'
                  : 'pending'
              const statusStyle = INVITE_STATUS_STYLE[effectiveStatus]
              const expiryLabel = new Date(inv.expiresAt).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'short', year: 'numeric',
              })
              return (
                <div
                  key={inv._id}
                  className="grid gap-3.5 px-5 py-3 border-b items-center"
                  style={{ gridTemplateColumns: '1.6fr 90px 100px 1fr 100px', borderColor: 'var(--ds-border)' }}
                >
                  <div className="text-[13px] font-medium ds-text-primary truncate">{inv.email}</div>
                  <div>
                    <span
                      className="inline-flex items-center px-2 py-[3px] rounded-full text-[11px] font-semibold"
                      style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-secondary)' }}
                    >
                      {INVITE_ROLE_LABEL[inv.role] ?? inv.role}
                    </span>
                  </div>
                  <div>
                    <span
                      className="inline-flex items-center px-2 py-[3px] rounded-full text-[11px] font-semibold"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {statusStyle.label}
                    </span>
                  </div>
                  <div className="text-[11.5px] ds-text-tertiary">
                    {effectiveStatus === 'accepted' ? '—' : `Expire le ${expiryLabel}`}
                  </div>
                  <div className="text-right">
                    {effectiveStatus !== 'accepted' && (
                      <button
                        onClick={() => handleResend(inv)}
                        disabled={resendingId === inv._id}
                        className="text-[12px] font-semibold transition-colors disabled:opacity-50"
                        style={{ color: '#E8920A' }}
                      >
                        {resendingId === inv._id ? 'Envoi…' : 'Renvoyer'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Remove confirmation modal */}
      {confirmRemove && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget && !removing) setConfirmRemove(null) }}
        >
          <div
            className="rounded-2xl overflow-hidden w-[400px] max-w-full"
            style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}
          >
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--ds-error-soft)' }}>
                  <Trash2 size={16} style={{ color: 'var(--ds-error)' }} />
                </div>
                <div className="font-bold text-[15px] ds-text-primary">Retirer {confirmRemove.name} de l'équipe ?</div>
              </div>
              <p className="text-[13px] ds-text-secondary leading-[1.5]">
                {confirmRemove.name} perdra l'accès au dashboard de {restaurantName}. Cette action est irréversible.
              </p>
            </div>
            <div className="flex items-center gap-2 px-6 pb-5">
              <button
                onClick={() => setConfirmRemove(null)}
                disabled={removing}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors disabled:opacity-50"
                style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
              >
                Annuler
              </button>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: 'var(--ds-error)' }}
              >
                {removing ? 'Suppression…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowInvite(false) }}
        >
          <div
            className="rounded-2xl overflow-hidden w-[440px] max-w-full"
            style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
              <div className="font-bold text-[15px] ds-text-primary">Inviter un membre</div>
              <button onClick={() => setShowInvite(false)} className="ds-text-tertiary hover:ds-text-primary">
                <Plus size={16} className="rotate-45" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' && !inviting) handleInvite() }}
                  placeholder="marie@restaurant.fr"
                  autoFocus
                  className="w-full rounded-lg border px-3 py-2 text-[13.5px] outline-none transition-all"
                  style={{
                    background: 'var(--ds-bg-surface)',
                    borderColor: 'var(--ds-border)',
                    color: 'var(--ds-text-primary)',
                    fontSize: '16px',
                  }}
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold ds-text-primary mb-2">Rôle</label>
                <div className="space-y-2">
                  {INVITE_ROLES.map(r => (
                    <label
                      key={r.id}
                      className="flex items-start gap-3 p-3 rounded-[9px] border cursor-pointer transition-colors"
                      style={{
                        borderColor: inviteForm.role === r.id ? '#E8920A' : 'var(--ds-border)',
                        background: inviteForm.role === r.id ? 'var(--ds-accent-soft)' : 'var(--ds-bg-base)',
                      }}
                    >
                      <input
                        type="radio"
                        name="invite-role"
                        value={r.id}
                        checked={inviteForm.role === r.id}
                        onChange={() => setInviteForm(f => ({ ...f, role: r.id }))}
                        className="sr-only"
                      />
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ borderColor: inviteForm.role === r.id ? '#E8920A' : 'var(--ds-border-strong)' }}
                      >
                        {inviteForm.role === r.id && (
                          <div className="w-2 h-2 rounded-full" style={{ background: '#E8920A' }} />
                        )}
                      </div>
                      <div>
                        <div
                          className="text-[13px] font-semibold"
                          style={{ color: inviteForm.role === r.id ? 'var(--ds-accent-strong)' : 'var(--ds-text-primary)' }}
                        >
                          {r.label}
                        </div>
                        <div className="text-[11.5px] ds-text-tertiary mt-0.5">{r.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-6 pb-5">
              <button
                onClick={() => setShowInvite(false)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors"
                style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
              >
                Annuler
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !EMAIL_RE.test(inviteForm.email.trim())}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: '#E8920A' }}
              >
                {inviting ? 'Envoi…' : 'Envoyer invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roles explanation modal */}
      {showRoles && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowRoles(false) }}
        >
          <div
            className="rounded-2xl overflow-hidden w-[480px] max-w-full"
            style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
              <div className="font-bold text-[15px] ds-text-primary">Comprendre les rôles</div>
              <button onClick={() => setShowRoles(false)} className="ds-text-tertiary hover:ds-text-primary">
                <Plus size={16} className="rotate-45" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                {
                  role: 'owner' as MemberRole,
                  desc: "Accès complet : paramètres, équipe, facturation, toutes les sections. Peut supprimer le compte.",
                },
                {
                  role: 'manager' as MemberRole,
                  desc: "Accès au dashboard opérationnel : tables, feedbacks, analytics, factures. Ne peut pas gérer l'équipe ni la facturation.",
                },
                {
                  role: 'staff' as MemberRole,
                  desc: "Accès en lecture aux tables et feedbacks du jour uniquement. Idéal pour le personnel de salle.",
                },
              ].map(({ role, desc }) => {
                const s = ROLE_STYLE[role]
                return (
                  <div key={role} className="flex gap-3">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 h-fit mt-0.5"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                    <p className="text-[13px] ds-text-secondary leading-[1.5]">{desc}</p>
                  </div>
                )
              })}
            </div>
            <div className="px-6 pb-5">
              <button
                onClick={() => setShowRoles(false)}
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white"
                style={{ background: '#E8920A' }}
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// EXTRAS SECTION (personnel d'appoint — envoi des convocations = partie 2)
// ══════════════════════════════════════════════════════════════

type ExtraForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
  skills: string[]
  notes: string
}

const EMPTY_EXTRA_FORM: ExtraForm = {
  firstName: '', lastName: '', email: '', phone: '', skills: [], notes: '',
}

function ExtrasSection({ restaurantId }: { restaurantId: Id<'restaurants'> | null }) {
  const role = useRestaurantRole()
  const extras = useQuery(api.extras.list, restaurantId ? { restaurantId } : 'skip')
  const addExtra     = useMutation(api.extras.add)
  const updateExtra  = useMutation(api.extras.update)
  const archiveExtra = useMutation(api.extras.archive)
  const convoke      = useAction(api.extras.convoke)
  const { user } = useUser()
  const restaurant = useRestaurant()
  const restaurantName = restaurant?.name ?? 'votre restaurant'
  // Email de l'expéditeur (réponses des extras via mailto / reply_to).
  const managerEmail =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? ''

  const [form, setForm] = useState<ExtraForm>(EMPTY_EXTRA_FORM)
  const [editingId, setEditingId] = useState<Id<'extras'> | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState<{ id: Id<'extras'>; name: string } | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [historyExtra, setHistoryExtra] = useState<{ id: Id<'extras'>; name: string } | null>(null)
  const [convokeExtra, setConvokeExtra] = useState<{ id: Id<'extras'>; firstName: string; name: string } | null>(null)
  const [convokeForm, setConvokeForm] = useState<{ shiftDate: string; shiftStart: string; shiftEnd: string; subject: string; message: string }>({
    shiftDate: '', shiftStart: '', shiftEnd: '', subject: '', message: '',
  })
  const [sendingConvoke, setSendingConvoke] = useState(false)

  // Viewer / équipier : section masquée (owner + manager uniquement).
  if (role === 'viewer') return null

  const inputStyle = {
    background: 'var(--ds-bg-surface)',
    borderColor: 'var(--ds-border)',
    color: 'var(--ds-text-primary)',
    fontSize: '16px',
  } as const

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_EXTRA_FORM)
    setShowForm(true)
  }

  function openEdit(extra: NonNullable<typeof extras>[number]) {
    setEditingId(extra._id)
    setForm({
      firstName: extra.firstName,
      lastName: extra.lastName,
      email: extra.email,
      phone: extra.phone ?? '',
      skills: extra.skills,
      notes: extra.notes ?? '',
    })
    setOpenMenu(null)
    setShowForm(true)
  }

  function toggleSkill(id: string) {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(id) ? f.skills.filter(s => s !== id) : [...f.skills, id],
    }))
  }

  const formValid =
    form.firstName.trim() !== '' &&
    form.lastName.trim() !== '' &&
    EMAIL_RE.test(form.email.trim())

  async function handleSave() {
    if (!formValid || saving) return
    setSaving(true)
    try {
      if (editingId) {
        await updateExtra({
          extraId: editingId,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          skills: form.skills,
          notes: form.notes,
        })
        toast.success('Extra mis à jour')
      } else {
        if (!restaurantId) return
        await addExtra({
          restaurantId,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          skills: form.skills,
          notes: form.notes || undefined,
        })
        toast.success(`${form.firstName.trim()} ajouté(e) aux extras`)
      }
      setShowForm(false)
    } catch {
      toast.error("Échec de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!confirmArchive) return
    setArchiving(true)
    try {
      await archiveExtra({ extraId: confirmArchive.id })
      toast.success(`${confirmArchive.name} archivé(e)`)
      setConfirmArchive(null)
    } catch {
      toast.error("Échec de l'archivage")
    } finally {
      setArchiving(false)
    }
  }

  function openConvoke(extra: NonNullable<typeof extras>[number]) {
    setConvokeExtra({ id: extra._id, firstName: extra.firstName, name: `${extra.firstName} ${extra.lastName}` })
    setConvokeForm({
      shiftDate: '',
      shiftStart: '',
      shiftEnd: '',
      subject: `[${restaurantName}] Demande de disponibilité`,
      message: '',
    })
  }

  async function handleSendConvoke() {
    if (!convokeExtra || sendingConvoke) return
    if (!convokeForm.message.trim()) {
      toast.error("Ajoutez un message avant d'envoyer")
      return
    }
    setSendingConvoke(true)
    try {
      const res = await convoke({
        extraId: convokeExtra.id,
        subject: convokeForm.subject.trim() || `[${restaurantName}] Demande de disponibilité`,
        message: convokeForm.message,
        shiftDate: convokeForm.shiftDate || undefined,
        shiftStart: convokeForm.shiftStart || undefined,
        shiftEnd: convokeForm.shiftEnd || undefined,
        managerEmail: managerEmail || undefined,
      })
      if (res.success) {
        toast.success(`Email envoyé à ${convokeExtra.firstName}`)
        setConvokeExtra(null)
      } else {
        toast.error(res.error || "Échec de l'envoi de la convocation")
      }
    } catch {
      toast.error("Échec de l'envoi de la convocation")
    } finally {
      setSendingConvoke(false)
    }
  }

  const list = extras ?? []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-extrabold tracking-[-0.03em]" style={{ fontSize: '24px', color: 'var(--ds-text-primary)' }}>
            Extras
          </h2>
          <p className="text-[13.5px] mt-1.5 max-w-lg" style={{ color: 'var(--ds-text-secondary)' }}>
            Votre carnet de personnel d'appoint pour les remplacements et les renforts.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[13px] font-semibold text-white shrink-0"
          style={{ background: '#E8920A' }}
        >
          <Plus size={14} />
          Ajouter un extra
        </button>
      </div>

      {/* List */}
      {extras === undefined ? (
        <div className="ds-panel p-12 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#E8920A', borderTopColor: 'transparent' }} />
        </div>
      ) : list.length === 0 ? (
        <div className="ds-panel p-10 text-center">
          <div className="w-11 h-11 rounded-full flex items-center justify-center mx-auto" style={{ background: 'var(--ds-accent-soft)' }}>
            <UserRound size={20} style={{ color: 'var(--ds-accent)' }} />
          </div>
          <div className="text-[14px] font-semibold ds-text-primary mt-3">Aucun extra pour l'instant</div>
          <div className="text-[12.5px] ds-text-tertiary mt-1 max-w-sm mx-auto">
            Ajoutez vos extras pour les contacter rapidement lors d'un coup de feu.
          </div>
          <button onClick={openAdd} className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold text-white" style={{ background: '#E8920A' }}>
            <Plus size={14} /> Ajouter un extra
          </button>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {list.map(extra => {
            const initials = `${extra.firstName[0] ?? ''}${extra.lastName[0] ?? ''}`.toUpperCase()
            return (
              <div key={extra._id} className="ds-panel p-4" style={{ overflow: 'visible' }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12.5px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, #FFB453, #E8920A)' }}>
                    {initials || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold ds-text-primary truncate">{extra.firstName} {extra.lastName}</div>
                    <div className="flex items-center gap-1.5 mt-1 text-[12px] ds-text-tertiary">
                      <Mail size={12} className="shrink-0" />
                      <span className="truncate">{extra.email}</span>
                    </div>
                    {extra.phone && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-[12px] ds-text-tertiary">
                        <Phone size={12} className="shrink-0" />
                        <span>{extra.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openConvoke(extra)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-[6px] rounded-lg text-[12px] font-semibold"
                      style={{ background: 'var(--ds-accent-soft)', color: 'var(--ds-accent-strong)' }}
                    >
                      <Mail size={13} />
                      Convoquer
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === extra._id ? null : extra._id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ color: 'var(--ds-text-tertiary)' }}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenu === extra._id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                          <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border py-1 shadow-lg" style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)' }}>
                            <button onClick={() => openEdit(extra)} className="w-full text-left px-3 py-2 text-[12.5px] font-medium flex items-center gap-2 hover:bg-[var(--ds-bg-subtle)]" style={{ color: 'var(--ds-text-primary)' }}>
                              <Pencil size={13} /> Modifier
                            </button>
                            <button onClick={() => { setHistoryExtra({ id: extra._id, name: `${extra.firstName} ${extra.lastName}` }); setOpenMenu(null) }} className="w-full text-left px-3 py-2 text-[12.5px] font-medium flex items-center gap-2 hover:bg-[var(--ds-bg-subtle)]" style={{ color: 'var(--ds-text-primary)' }}>
                              <History size={13} /> Voir l'historique
                            </button>
                            <button onClick={() => { setConfirmArchive({ id: extra._id, name: `${extra.firstName} ${extra.lastName}` }); setOpenMenu(null) }} className="w-full text-left px-3 py-2 text-[12.5px] font-medium flex items-center gap-2 hover:bg-[var(--ds-bg-subtle)]" style={{ color: 'var(--ds-error)' }}>
                              <Archive size={13} /> Archiver
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {extra.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {extra.skills.map(s => (
                      <span key={s} className="inline-flex items-center px-2 py-[3px] rounded-full text-[11px] font-semibold" style={{ background: 'var(--ds-accent-soft)', color: 'var(--ds-accent-strong)' }}>
                        {EXTRA_SKILL_LABEL[s] ?? s}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-[11.5px] ds-text-tertiary mt-3 pt-3 border-t" style={{ borderColor: 'var(--ds-border)' }}>
                  {formatLastConvocation(extra.lastConvokedAt)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget && !saving) setShowForm(false) }}
        >
          <div
            className="rounded-2xl overflow-hidden w-[480px] max-w-full max-h-[90vh] flex flex-col"
            style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
              <div className="font-bold text-[15px] ds-text-primary">{editingId ? "Modifier l'extra" : 'Ajouter un extra'}</div>
              <button onClick={() => setShowForm(false)} className="ds-text-tertiary hover:ds-text-primary"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Prénom *</label>
                  <input
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    autoFocus
                    placeholder="Marie"
                    className="w-full rounded-lg border px-3 py-2 outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Nom *</label>
                  <input
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Durand"
                    className="w-full rounded-lg border px-3 py-2 outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="marie@email.fr"
                  className="w-full rounded-lg border px-3 py-2 outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Téléphone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="06 12 34 56 78"
                  className="w-full rounded-lg border px-3 py-2 outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold ds-text-primary mb-2">Compétences</label>
                <div className="grid grid-cols-3 gap-2">
                  {EXTRA_SKILLS.map(s => {
                    const active = form.skills.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSkill(s.id)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[12.5px] font-medium transition-colors"
                        style={{
                          borderColor: active ? '#E8920A' : 'var(--ds-border)',
                          background: active ? 'var(--ds-accent-soft)' : 'var(--ds-bg-base)',
                          color: active ? 'var(--ds-accent-strong)' : 'var(--ds-text-secondary)',
                        }}
                      >
                        <span
                          className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                          style={{ borderColor: active ? '#E8920A' : 'var(--ds-border-strong)', background: active ? '#E8920A' : 'transparent' }}
                        >
                          {active && <Check size={11} className="text-white" />}
                        </span>
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Notes internes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Disponible le week-end, parle anglais…"
                  className="w-full rounded-lg border px-3 py-2 outline-none resize-none"
                  style={inputStyle}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors disabled:opacity-50"
                style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formValid}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: '#E8920A' }}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive confirmation modal */}
      {confirmArchive && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget && !archiving) setConfirmArchive(null) }}
        >
          <div
            className="rounded-2xl overflow-hidden w-[400px] max-w-full"
            style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}
          >
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--ds-warning-soft)' }}>
                  <Archive size={16} style={{ color: 'var(--ds-warning)' }} />
                </div>
                <div className="font-bold text-[15px] ds-text-primary">Archiver {confirmArchive.name} ?</div>
              </div>
              <p className="text-[13px] ds-text-secondary leading-[1.5]">
                {confirmArchive.name} n'apparaîtra plus dans votre liste d'extras. Son historique de convocations est conservé.
              </p>
            </div>
            <div className="flex items-center gap-2 px-6 pb-5">
              <button
                onClick={() => setConfirmArchive(null)}
                disabled={archiving}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors disabled:opacity-50"
                style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
              >
                Annuler
              </button>
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: 'var(--ds-warning)' }}
              >
                {archiving ? 'Archivage…' : 'Archiver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History drawer */}
      {historyExtra && (
        <ExtraHistoryDrawer extra={historyExtra} onClose={() => setHistoryExtra(null)} />
      )}

      {/* Convoke modal */}
      {convokeExtra && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget && !sendingConvoke) setConvokeExtra(null) }}
        >
          <div
            className="rounded-2xl overflow-hidden w-[500px] max-w-full max-h-[90vh] flex flex-col"
            style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
              <div className="font-bold text-[15px] ds-text-primary">Convoquer {convokeExtra.firstName}</div>
              <button onClick={() => setConvokeExtra(null)} className="ds-text-tertiary hover:ds-text-primary"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Date du service</label>
                <input
                  type="date"
                  value={convokeForm.shiftDate}
                  onChange={e => setConvokeForm(f => ({ ...f, shiftDate: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Heure de début</label>
                  <input
                    type="time"
                    value={convokeForm.shiftStart}
                    onChange={e => setConvokeForm(f => ({ ...f, shiftStart: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Heure de fin</label>
                  <input
                    type="time"
                    value={convokeForm.shiftEnd}
                    onChange={e => setConvokeForm(f => ({ ...f, shiftEnd: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Objet de l'email</label>
                <input
                  type="text"
                  value={convokeForm.subject}
                  onChange={e => setConvokeForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Message</label>
                <textarea
                  value={convokeForm.message}
                  onChange={e => setConvokeForm(f => ({ ...f, message: e.target.value }))}
                  rows={4}
                  placeholder={`Bonjour ${convokeExtra.firstName}, nous avons besoin de toi…`}
                  className="w-full rounded-lg border px-3 py-2 outline-none resize-none"
                  style={inputStyle}
                />
                <p className="text-[11.5px] ds-text-tertiary mt-1.5">
                  L'email part de noreply@splitzy.fr ; les réponses arrivent sur {managerEmail || 'votre adresse'}.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
              <button
                onClick={() => setConvokeExtra(null)}
                disabled={sendingConvoke}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors disabled:opacity-50"
                style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
              >
                Annuler
              </button>
              <button
                onClick={handleSendConvoke}
                disabled={sendingConvoke || !convokeForm.message.trim()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: '#E8920A' }}
              >
                {sendingConvoke ? 'Envoi…' : (<><Mail size={14} /> Envoyer la convocation</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Drawer latéral lecture seule — historique des convocations d'un extra. Monté
// uniquement quand un extra est sélectionné, pour que la query parte avec un id
// concret (et non 'skip').
function ExtraHistoryDrawer({
  extra,
  onClose,
}: {
  extra: { id: Id<'extras'>; name: string }
  onClose: () => void
}) {
  const convocations = useQuery(api.extraConvocations.list, { extraId: extra.id })
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative w-[440px] max-w-full h-full flex flex-col"
        style={{ background: 'var(--ds-bg-surface)', boxShadow: '-8px 0 32px rgba(0,0,0,0.18)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
          <div>
            <div className="font-bold text-[15px] ds-text-primary">Historique des convocations</div>
            <div className="text-[12px] ds-text-tertiary mt-0.5">{extra.name}</div>
          </div>
          <button onClick={onClose} className="ds-text-tertiary hover:ds-text-primary"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {convocations === undefined ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#E8920A', borderTopColor: 'transparent' }} />
            </div>
          ) : convocations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-11 h-11 rounded-full flex items-center justify-center mx-auto" style={{ background: 'var(--ds-bg-subtle)' }}>
                <History size={20} style={{ color: 'var(--ds-text-tertiary)' }} />
              </div>
              <div className="text-[13.5px] font-semibold ds-text-primary mt-3">Aucune convocation</div>
              <div className="text-[12px] ds-text-tertiary mt-1 max-w-[240px] mx-auto">
                L'historique apparaîtra ici après le premier envoi.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {convocations.map(c => {
                const ok = c.emailStatus === 'sent'
                return (
                  <div key={c._id} className="rounded-xl border p-3.5" style={{ borderColor: 'var(--ds-border)', background: 'var(--ds-bg-base)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[13px] font-semibold ds-text-primary">{c.subject}</div>
                      <span
                        className="inline-flex items-center px-2 py-[2px] rounded-full text-[10.5px] font-semibold whitespace-nowrap shrink-0"
                        style={{
                          background: ok ? 'var(--ds-success-soft)' : 'var(--ds-error-soft)',
                          color: ok ? 'var(--ds-success-strong)' : 'var(--ds-error)',
                        }}
                      >
                        {ok ? '✓ Envoyé' : '✕ Échec'}
                      </span>
                    </div>
                    {(c.shiftDate || c.shiftStart) && (
                      <div className="text-[12px] ds-text-secondary mt-1.5">
                        {c.shiftDate}{c.shiftStart ? ` · ${c.shiftStart}${c.shiftEnd ? `–${c.shiftEnd}` : ''}` : ''}
                      </div>
                    )}
                    <div className="text-[11.5px] ds-text-tertiary mt-1.5">
                      Envoyé le {new Date(c.sentAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {(c.response === 'accepted' || c.response === 'declined') ? (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span
                          className="inline-flex items-center px-2 py-[2px] rounded-full text-[10.5px] font-semibold"
                          style={{
                            background: c.response === 'accepted' ? 'var(--ds-success-soft)' : 'var(--ds-error-soft)',
                            color: c.response === 'accepted' ? 'var(--ds-success-strong)' : 'var(--ds-error)',
                          }}
                        >
                          {c.response === 'accepted' ? '✓ Disponible' : '✕ Indisponible'}
                        </span>
                        {c.respondedAt && (
                          <span className="text-[11px] ds-text-tertiary">
                            répondu le {new Date(c.respondedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ) : ok ? (
                      <div className="mt-2">
                        <span
                          className="inline-flex items-center px-2 py-[2px] rounded-full text-[10.5px] font-semibold ds-text-tertiary"
                          style={{ background: 'var(--ds-bg-base)', border: '1px solid var(--ds-border)' }}
                        >
                          ⏳ En attente de réponse
                        </span>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ACCOUNT SECTION
// ══════════════════════════════════════════════════════════════

function AccountSection({
  restaurant,
  restaurantId,
}: {
  restaurant: ReturnType<typeof useRestaurant>
  restaurantId: Id<'restaurants'> | null
}) {
  const { user } = useUser()
  const { openUserProfile, signOut } = useClerk()
  const navigate = useNavigate()
  const deleteAll    = useMutation(api.restaurants.deleteAll)
  const syncMemberProfile = useMutation(api.members.syncMyProfile)

  const [deleteModal,    setDeleteModal]   = useState(false)
  const [deleteConfirm,  setDeleteConfirm] = useState('')
  const [dangerLoading,  setDangerLoading] = useState(false)

  // Champs Prénom / Nom éditables (source : Clerk). Pré-remplis dès que Clerk a
  // chargé l'utilisateur, sauvegardés via user.update().
  const [firstName,      setFirstName]     = useState('')
  const [lastName,       setLastName]      = useState('')
  const [savingProfile,  setSavingProfile] = useState(false)
  const [profileSaved,   setProfileSaved]  = useState(false)

  useEffect(() => {
    if (!user) return
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
  }, [user])

  const profileDirty =
    !!user &&
    (firstName.trim() !== (user.firstName ?? '') || lastName.trim() !== (user.lastName ?? ''))

  async function handleSaveProfile() {
    if (!user || !profileDirty || savingProfile) return
    setSavingProfile(true)
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() })
      // Répercute le nom sur la ligne `members` du gérant (si elle existe) pour que
      // la page Équipe affiche le vrai nom plutôt qu'un libellé dérivé de l'email.
      await syncMemberProfile({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      }).catch(() => {})
      setProfileSaved(true)
      toast.success('Profil mis à jour')
      setTimeout(() => setProfileSaved(false), 2000)
    } catch {
      toast.error("Impossible d'enregistrer le profil")
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleDelete() {
    if (!restaurantId || deleteConfirm.trim().toLowerCase() !== (restaurant?.name ?? '').toLowerCase()) return
    setDangerLoading(true)
    await deleteAll({ id: restaurantId }).catch(() => {})
    await signOut()
    navigate('/restaurant/sign-in', { replace: true })
  }

  const inputStyle = {
    background: 'var(--ds-bg-surface)',
    borderColor: 'var(--ds-border)',
    color: 'var(--ds-text-primary)',
    fontSize: '16px' as const,
  }

  return (
    <div className="space-y-5">
      <div>
        <h2
          className="font-extrabold tracking-[-0.03em]"
          style={{ fontSize: '24px', color: 'var(--ds-text-primary)' }}
        >
          Compte
        </h2>
        <p className="text-[13.5px] mt-1.5" style={{ color: 'var(--ds-text-secondary)' }}>
          Informations personnelles et sécurité de votre compte.
        </p>
      </div>

      {/* Profile block */}
      <div className="ds-panel">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
          <div>
            <div className="font-bold text-[13.5px] ds-text-primary">Profil</div>
            <div className="text-[12px] ds-text-tertiary mt-0.5">Vos informations personnelles</div>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={!profileDirty || savingProfile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: profileSaved ? 'var(--ds-success)' : '#E8920A' }}
          >
            {profileSaved
              ? <><Check size={13} />Enregistré</>
              : savingProfile ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Prénom</label>
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Votre prénom"
                className="w-full rounded-lg border px-3 py-2 text-[13.5px] outline-none focus:border-[#E8920A]"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Nom</label>
              <input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Votre nom"
                className="w-full rounded-lg border px-3 py-2 text-[13.5px] outline-none focus:border-[#E8920A]"
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">
              Email
              <span className="ml-2 text-[11px] font-normal ds-text-tertiary">(lecture seule)</span>
            </label>
            <input
              readOnly
              value={user?.emailAddresses[0]?.emailAddress ?? ''}
              className="w-full rounded-lg border px-3 py-2 text-[13.5px] cursor-default"
              style={{ ...inputStyle, opacity: 0.7 }}
            />
          </div>
        </div>
        <div
          className="flex items-center justify-between px-5 py-3 border-t"
          style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}
        >
          <span className="text-[12px] ds-text-tertiary">Géré via Clerk</span>
          <button
            onClick={() => openUserProfile()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium border transition-colors"
            style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
          >
            <KeyRound size={13} />
            Changer le mot de passe
            <ChevronRight size={12} style={{ color: 'var(--ds-text-tertiary)' }} />
          </button>
        </div>
      </div>

      {/* Security block — masqué tant que FEATURE_MFA_ENABLED est false (la
          section ne contient que le bloc 2FA, on cache donc le panneau entier
          y compris le titre "Sécurité" pour éviter un titre orphelin) */}
      {FEATURE_MFA_ENABLED && (
      <div className="ds-panel">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
          <div className="font-bold text-[13.5px] ds-text-primary flex items-center gap-2">
            <Shield size={14} style={{ color: 'var(--ds-text-tertiary)' }} />
            Sécurité
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[13.5px] font-semibold ds-text-primary">Authentification à deux facteurs</div>
              <div className="text-[12px] ds-text-tertiary mt-0.5">Renforcez la sécurité de votre compte avec une 2FA.</div>
            </div>
            <button
              onClick={() => openUserProfile()}
              className="shrink-0 px-3 py-1.5 rounded-lg text-[12.5px] font-medium border transition-colors"
              style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
            >
              Configurer
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Danger zone */}
      <div className="ds-panel" style={{ borderColor: '#FECACA' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: '#FECACA' }}>
          <div className="font-bold text-[13.5px]" style={{ color: 'var(--ds-error)' }}>Zone dangereuse</div>
          <div className="text-[12px] ds-text-tertiary mt-0.5">Ces actions sont irréversibles.</div>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[13.5px] font-semibold ds-text-primary">Supprimer mon compte</div>
              <div className="text-[12px] ds-text-tertiary mt-0.5">
                Supprime toutes les données du restaurant (tables, paiements, feedbacks).
              </div>
            </div>
            <button
              onClick={() => setDeleteModal(true)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors"
              style={{ background: 'var(--ds-error-soft)', color: 'var(--ds-error-strong)', border: 'none' }}
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setDeleteModal(false) }}
        >
          <div
            className="rounded-2xl overflow-hidden w-[440px] max-w-full"
            style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.28)' }}
          >
            <div className="px-6 py-5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'var(--ds-error-soft)' }}
              >
                <Trash2 size={18} style={{ color: 'var(--ds-error)' }} />
              </div>
              <div className="font-bold text-[17px] ds-text-primary mb-1.5">Supprimer le compte</div>
              <p className="text-[13px] ds-text-secondary leading-[1.5] mb-4">
                Cette action est irréversible. Toutes les données (tables, paiements, feedbacks, menu) seront définitivement supprimées.
              </p>
              <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">
                Pour confirmer, tapez le nom du restaurant : <strong>{restaurant?.name}</strong>
              </label>
              <input
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={restaurant?.name ?? ''}
                className="w-full rounded-lg border px-3 py-2 text-[13.5px] outline-none"
                style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '16px' }}
              />
            </div>
            <div className="flex gap-2 px-6 pb-5">
              <button
                onClick={() => { setDeleteModal(false); setDeleteConfirm('') }}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border"
                style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={dangerLoading || deleteConfirm.trim().toLowerCase() !== (restaurant?.name ?? '').toLowerCase()}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-40"
                style={{ background: 'var(--ds-error)' }}
              >
                {dangerLoading ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PLAN SECTION
// ══════════════════════════════════════════════════════════════

const PLAN_FEATURES = {
  gratuit: [
    "Jusqu'à 5 tables",
    '50 paiements / mois',
    'QR codes inclus',
    'Feedbacks clients',
    'Dashboard basique',
  ],
  essentiel: [
    "Jusqu'à 20 tables",
    'Paiements illimités',
    'QR codes personnalisés',
    'Analytics hebdomadaires',
    'Réputation & Google',
    'Support email',
  ],
  pro: [
    'Tables illimitées',
    'Paiements illimités',
    'Score Splitzy avancé',
    'Insights IA',
    'Intégrations POS',
    'Gestion équipe',
    'Support prioritaire',
  ],
}

function PlanSection({ restaurantId }: { restaurantId: Id<'restaurants'> | null }) {
  const feedbackCount = useQuery(api.feedbacks.list, restaurantId ? { restaurantId } : 'skip')?.length ?? 0
  const currentPlan = 'essentiel'
  const planLimit   = 300

  return (
    <div className="space-y-5">
      <div>
        <h2
          className="font-extrabold tracking-[-0.03em]"
          style={{ fontSize: '24px', color: 'var(--ds-text-primary)' }}
        >
          Plan & abonnement
        </h2>
        <p className="text-[13.5px] mt-1.5" style={{ color: 'var(--ds-text-secondary)' }}>
          Gérez votre abonnement Splitzy.
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(
          [
            { id: 'gratuit',   name: 'Gratuit',   price: '0€',   period: '',           features: PLAN_FEATURES.gratuit,   cta: null },
            { id: 'essentiel', name: 'Essentiel', price: '59€',  period: ' /mois',     features: PLAN_FEATURES.essentiel, cta: null },
            { id: 'pro',       name: 'Pro',        price: '99€',  period: ' /mois',     features: PLAN_FEATURES.pro,        cta: 'Passer au Pro' },
          ] as const
        ).map(plan => {
          const isCurrent = plan.id === currentPlan
          return (
            <div
              key={plan.id}
              className="rounded-[12px] p-[18px] flex flex-col gap-3 relative"
              style={{
                background: 'var(--ds-bg-surface)',
                border: isCurrent ? '1px solid #E8920A' : '1px solid var(--ds-border)',
                boxShadow: isCurrent ? '0 0 0 3px rgba(232,146,10,0.10)' : 'var(--ds-shadow-sm)',
              }}
            >
              {isCurrent && (
                <span
                  className="absolute top-3 right-3 text-[9.5px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--ds-accent-soft)', color: 'var(--ds-accent)' }}
                >
                  Actuel
                </span>
              )}
              <div className="font-bold text-[13px] ds-text-primary tracking-[-0.005em]">{plan.name}</div>
              <div className="flex items-baseline gap-1">
                <span
                  className="font-extrabold tracking-[-0.03em]"
                  style={{ fontSize: '28px', color: 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}
                >
                  {plan.price}
                </span>
                <span className="text-[12px] ds-text-secondary">{plan.period}</span>
              </div>
              <ul
                className="flex flex-col gap-1.5 pt-1 border-t"
                style={{ borderColor: 'var(--ds-border)' }}
              >
                {plan.features.map(feat => (
                  <li key={feat} className="flex items-start gap-1.5 text-[12.5px] ds-text-secondary">
                    <Check size={12} style={{ color: 'var(--ds-success)', flexShrink: 0, marginTop: 3 }} />
                    {feat}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-1">
                {plan.cta ? (
                  <a
                    href="mailto:splitzy.contact@gmail.com?subject=Passage au Plan Pro"
                    className="block text-center w-full py-2 rounded-[7px] text-[12px] font-semibold text-white transition-colors"
                    style={{ background: '#E8920A' }}
                  >
                    {plan.cta}
                  </a>
                ) : isCurrent ? (
                  <div
                    className="text-center text-[12px] font-medium py-2 rounded-[7px]"
                    style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-tertiary)' }}
                  >
                    Plan actuel
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {/* Usage block */}
      <div className="ds-panel">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
          <div className="font-bold text-[13.5px] ds-text-primary">Utilisation ce mois</div>
          <span className="text-[12px] ds-text-tertiary">Plan {currentPlan}</span>
        </div>
        <div className="px-5 py-4 space-y-3">
          {[
            { label: 'Feedbacks reçus', value: feedbackCount, limit: planLimit, unit: `/ ${planLimit}` },
            { label: 'Tables actives',  value: 10,            limit: 20,        unit: '/ 20 tables' },
          ].map(row => {
            const pct = Math.min(Math.round((row.value / row.limit) * 100), 100)
            const warning = pct >= 80
            return (
              <div key={row.label} className="grid items-center gap-3.5" style={{ gridTemplateColumns: '140px 1fr 100px' }}>
                <span className="text-[12.5px] font-medium ds-text-primary">{row.label}</span>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ds-bg-subtle)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: warning ? 'var(--ds-warning)' : '#E8920A',
                    }}
                  />
                </div>
                <span
                  className="text-[12px] text-right tabular-nums"
                  style={{ color: 'var(--ds-text-secondary)', fontFamily: 'monospace' }}
                >
                  {row.value} {row.unit}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Module 3 — Plan de salle (config). Gestion des zones + positionnement des
// tables sur la grille. Le drag n'est PAS géré ici : placement par sélection
// (table puis cellule vide). FloorPlan ne fait que rendre.
function TablesSection() {
  const restaurantId = useRestaurantId()
  const zones = useQuery(api.zones.list, restaurantId ? { restaurantId } : 'skip') ?? []
  const tables = useQuery(api.tables.list, restaurantId ? { restaurantId } : 'skip') ?? []
  const restaurant = useRestaurant()
  const gridCols = restaurant?.floorGridCols ?? 12
  const gridRows = restaurant?.floorGridRows ?? 8

  const createZone = useMutation(api.zones.create)
  const renameZone = useMutation(api.zones.rename)
  const removeZone = useMutation(api.zones.remove)
  const updateGridPosition = useMutation(api.tables.updateGridPosition)
  const updateZone = useMutation(api.tables.updateZone)
  const updateCapacity = useMutation(api.tables.updateCapacity)
  const updateLabel = useMutation(api.tables.updateLabel)
  const removeFromGrid = useMutation(api.tables.removeFromGrid)

  const [activeZoneId, setActiveZoneId] = useState<Id<'zones'> | null>(null)
  const [selectedTableId, setSelectedTableId] = useState<Id<'tables'> | null>(null)
  const [editingZoneId, setEditingZoneId] = useState<Id<'zones'> | null>(null)
  const [showNewZoneForm, setShowNewZoneForm] = useState(false)
  const [labelDraft, setLabelDraft] = useState('')

  const [editName, setEditName] = useState('')
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneColor, setNewZoneColor] = useState<string>(ZONE_PALETTE[0])

  const selectedTable = tables.find(t => t._id === selectedTableId) ?? null

  // Synchronise le brouillon de nom quand la table sélectionnée change.
  useEffect(() => {
    setLabelDraft(selectedTable?.label ?? '')
  }, [selectedTableId])

  async function handleCreateZone() {
    if (!restaurantId || !newZoneName.trim()) return
    await createZone({ restaurantId, name: newZoneName.trim(), color: newZoneColor })
    setNewZoneName('')
    setNewZoneColor(ZONE_PALETTE[0])
    setShowNewZoneForm(false)
    toast.success('Zone créée')
  }

  async function handleRenameZone(zoneId: Id<'zones'>) {
    if (!editName.trim()) return
    await renameZone({ zoneId, name: editName.trim() })
    setEditingZoneId(null)
    toast.success('Zone renommée')
  }

  async function handleRemoveZone(zoneId: Id<'zones'>, name: string) {
    if (!window.confirm(`Supprimer la zone « ${name} » ? Les tables associées seront détachées.`)) return
    if (activeZoneId === zoneId) setActiveZoneId(null)
    await removeZone({ zoneId })
    toast.success('Zone supprimée')
  }

  return (
    <div className="space-y-5">
      {/* Zones */}
      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-dark">Zones</h2>
            <p className="text-xs text-muted mt-0.5">Salle, terrasse, bar… regroupez vos tables.</p>
          </div>
          {!showNewZoneForm && (
            <button
              onClick={() => setShowNewZoneForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-dark transition-colors"
            >
              <Plus size={14} /> Nouvelle zone
            </button>
          )}
        </div>

        {zones.length === 0 && !showNewZoneForm && (
          <div className="text-sm text-muted py-4 text-center">Aucune zone — créez-en une pour organiser votre plan.</div>
        )}

        <div className="divide-y divide-border">
          {zones.map(zone => (
            <div key={zone._id} className="flex items-center gap-3 py-3">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: zone.color, width: 12, height: 12 }}
              />
              {editingZoneId === zone._id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRenameZone(zone._id) }}
                  className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              ) : (
                <span className="flex-1 text-sm font-semibold text-dark truncate">{zone.name}</span>
              )}
              {editingZoneId === zone._id ? (
                <>
                  <button
                    onClick={() => handleRenameZone(zone._id)}
                    className="text-xs font-semibold text-brand px-2 py-1 rounded hover:bg-brand-bg transition-colors"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => setEditingZoneId(null)}
                    className="text-xs text-muted px-2 py-1 rounded hover:bg-bg transition-colors"
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setEditingZoneId(zone._id); setEditName(zone.name) }}
                    className="flex items-center gap-1 text-xs text-muted hover:text-brand transition-colors px-2 py-1 rounded hover:bg-brand-bg"
                  >
                    <Pencil size={12} /> Modifier
                  </button>
                  <button
                    onClick={() => handleRemoveZone(zone._id, zone.name)}
                    className="flex items-center gap-1 text-xs text-muted hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                  >
                    <Trash2 size={12} /> Supprimer
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {showNewZoneForm && (
          <div className="mt-4 border border-border rounded-xl p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Nom de la zone</label>
              <input
                autoFocus
                value={newZoneName}
                onChange={e => setNewZoneName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateZone() }}
                placeholder="Terrasse"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Couleur</label>
              <div className="flex flex-wrap gap-2">
                {ZONE_PALETTE.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewZoneColor(color)}
                    className="w-8 h-8 rounded-full transition-all"
                    style={{
                      background: color,
                      boxShadow: newZoneColor === color ? '0 0 0 2px #fff, 0 0 0 4px #E8920A' : '0 0 0 1px var(--ds-border)',
                    }}
                    aria-label={`Couleur ${color}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateZone}
                disabled={!newZoneName.trim()}
                className="flex-1 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-40"
              >
                Créer la zone
              </button>
              <button
                onClick={() => { setShowNewZoneForm(false); setNewZoneName('') }}
                className="flex-1 py-2 rounded-lg border border-border text-sm font-semibold text-mid hover:bg-bg transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Plan de salle */}
      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        <div className="mb-4">
          <h2 className="text-base font-bold text-dark">Plan de salle</h2>
          <p className="text-xs text-muted mt-0.5">
            Cliquez une table pour la sélectionner, puis une cellule vide pour la déplacer. Sélectionnez-la aussi pour modifier ses paramètres.
          </p>
        </div>

        {selectedTable && (
          <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            {selectedTable.label ?? `T${selectedTable.number}`} sélectionnée — cliquez une cellule vide pour la déplacer
            <button onClick={() => setSelectedTableId(null)} className="hover:text-amber-950">
              <X size={13} />
            </button>
          </div>
        )}

        <FloorPlan
          mode="config"
          gridCols={gridCols}
          gridRows={gridRows}
          tables={tables}
          zones={zones}
          activeZoneId={activeZoneId}
          selectedTableId={selectedTableId}
          onZoneChange={setActiveZoneId}
          onTableClick={(tableId) => {
            // Toute table (placée ou non) → sélection pour déplacement / paramètres.
            setSelectedTableId(prev => prev === tableId ? null : tableId)
          }}
          onCellClick={async (x, y) => {
            if (!selectedTableId || !restaurantId) return
            await updateGridPosition({ tableId: selectedTableId, gridX: x, gridY: y })
            setSelectedTableId(null)
            toast.success('Table déplacée')
          }}
        />

        {selectedTable && (
          <div className="mt-4 border border-border rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-end gap-4">
              {/* Nom */}
              <div className="flex-1 min-w-[160px]">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">
                  <Pencil size={11} /> Nom
                </label>
                <input
                  value={labelDraft}
                  onChange={e => setLabelDraft(e.target.value)}
                  onBlur={async () => {
                    if ((selectedTable.label ?? '') === labelDraft.trim()) return
                    await updateLabel({ tableId: selectedTable._id, label: labelDraft })
                    toast.success('Nom mis à jour')
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  placeholder={`T${selectedTable.number}`}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              {/* Capacité */}
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">Couverts</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const next = Math.max(1, selectedTable.capacity - 1)
                      if (next === selectedTable.capacity) return
                      await updateCapacity({ tableId: selectedTable._id, capacity: next })
                    }}
                    disabled={selectedTable.capacity <= 1}
                    className="w-9 h-9 rounded-lg border border-border text-dark text-lg font-semibold hover:bg-bg transition-colors disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-dark tabular-nums">{selectedTable.capacity}</span>
                  <button
                    onClick={async () => {
                      const next = Math.min(30, selectedTable.capacity + 1)
                      if (next === selectedTable.capacity) return
                      await updateCapacity({ tableId: selectedTable._id, capacity: next })
                    }}
                    disabled={selectedTable.capacity >= 30}
                    className="w-9 h-9 rounded-lg border border-border text-dark text-lg font-semibold hover:bg-bg transition-colors disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-4 pt-1">
              {/* Zone */}
              <div className="flex-1 min-w-[160px]">
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wide mb-1.5">Zone</label>
                <select
                  value={selectedTable.zoneId ?? ''}
                  onChange={async (e) => {
                    const value = e.target.value
                    await updateZone({
                      tableId: selectedTable._id,
                      zoneId: value ? (value as Id<'zones'>) : undefined,
                    })
                    toast.success('Zone mise à jour')
                  }}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  <option value="">Aucune zone</option>
                  {zones.map(z => (
                    <option key={z._id} value={z._id}>{z.name}</option>
                  ))}
                </select>
              </div>

              {/* Retirer du plan */}
              {selectedTable.gridX != null && selectedTable.gridY != null && (
                <button
                  onClick={async () => {
                    await removeFromGrid({ tableId: selectedTable._id })
                    setSelectedTableId(null)
                    toast.success('Table retirée du plan')
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} /> Retirer du plan
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function Settings() {
  const restaurant = useRestaurant()
  const restaurantId = useRestaurantId()
  const updateRestaurant  = useMutation(api.restaurants.update)
  const setLogoStorageId  = useMutation((api.restaurants as any).setLogoStorageId)
  const generateUploadUrl = useAction((api.restaurants as any).generateUploadUrl)
  const logoUrl = useQuery(
    (api.restaurants as any).getLogoUrl,
    restaurant?.logoStorageId ? { storageId: restaurant.logoStorageId } : 'skip'
  ) as string | null | undefined
  const rawTables = useQuery(api.tables.list, restaurantId ? { restaurantId } : 'skip')
  const teamMembers = useQuery(api.members.getTeamMembers, restaurantId ? { restaurantId } : 'skip')

  const role = useRestaurantRole()
  // Manager : pas d'accès Équipe / Facturation / Plan & abonnement (réservé owner).
  // viewer n'atteint jamais cette page (RoleGuard /settings).
  const HIDDEN_FOR_MANAGER: SectionKey[] = ['team', 'billing', 'plan']
  const visibleNav = role === 'manager'
    ? SUB_NAV.filter(n => !HIDDEN_FOR_MANAGER.includes(n.key))
    : SUB_NAV

  const [section, setSection]       = useState<SectionKey>('restaurant')
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    type: 'restaurant',
  })

  // Sync form when restaurant loads
  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name ?? '',
        phone: restaurant.phone ?? '',
        address: restaurant.address ?? '',
        email: restaurant.email ?? '',
        type: restaurant.type ?? '',
      })
    }
  }, [restaurant?._id])

  // Sécurité : si un manager a (état résiduel) une section réservée sélectionnée,
  // on retombe sur 'restaurant' — le contenu réservé ne s'affiche jamais pour lui.
  useEffect(() => {
    if (role === 'manager' && HIDDEN_FOR_MANAGER.includes(section)) setSection('restaurant')
  }, [role, section])

  async function handleSave() {
    if (!restaurant) return
    setSaving(true)
    try {
      await updateRestaurant({ id: restaurant._id, ...form })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const [notifs, setNotifs] = useState({
    negativeFeedback: true,
    morningDigest:    true,
    endOfService:     false,
    weeklyRecap:      true,
  })

  return (
    <RestaurantLayout>
      <PageHeader title="Paramètres" subtitle={<span>Gérez votre établissement</span>} />
      <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
        <div className="flex flex-col md:flex-row gap-5 min-h-full">
          {/* Sub-nav */}
          <aside className="w-full md:w-[224px] md:shrink-0">
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--ds-bg-surface)', border: '1px solid var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
            >
              <div
                className="px-2.5 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.07em] hidden md:block"
                style={{ color: 'var(--ds-text-tertiary)' }}
              >
                Paramètres
              </div>
              <div className="flex overflow-x-auto md:block p-1.5 md:p-1.5 gap-1">
                {visibleNav.map(({ key, label, icon: Icon, pendingDot }) => {
                  const active = section === key
                  const pendingCount = pendingDot
                    ? (teamMembers?.filter(m => m.status === 'pending').length ?? 0)
                    : 0
                  return (
                    <button
                      key={key}
                      onClick={() => setSection(key)}
                      className="shrink-0 md:w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] text-[13.5px] font-medium transition-colors whitespace-nowrap"
                      style={{
                        background: active ? 'var(--ds-bg-surface)' : 'transparent',
                        color: active ? 'var(--ds-text-primary)' : 'var(--ds-text-secondary)',
                        fontWeight: active ? 600 : 500,
                        boxShadow: active ? 'var(--ds-shadow-sm)' : 'none',
                      }}
                    >
                      <Icon
                        size={15}
                        strokeWidth={1.75}
                        style={{ color: active ? '#E8920A' : 'var(--ds-text-tertiary)', flexShrink: 0 }}
                      />
                      <span className="flex-1 truncate">{label}</span>
                      {pendingCount > 0 && (
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: 'var(--ds-warning)', boxShadow: '0 0 0 2px rgba(245,158,11,0.18)' }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 space-y-5">
            {section === 'restaurant' && (
              <>
                {/* Logo upload */}
                <div className="ds-panel">
                  <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
                    <div>
                      <div className="font-bold text-[13.5px] ds-text-primary">Logo du restaurant</div>
                      <div className="text-[12px] ds-text-tertiary mt-0.5">PNG ou SVG transparent, 512 × 512 minimum</div>
                    </div>
                  </div>
                  <div className="px-5 py-5 flex items-center gap-5">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-20 h-20 rounded-[14px] object-contain flex-shrink-0" style={{ background: '#1A1A1A', padding: '8px' }} />
                    ) : (
                      <div className="w-20 h-20 rounded-[14px] flex items-center justify-center gap-1 flex-shrink-0" style={{ background: '#1A1A1A', padding: '14px' }}>
                        <div className="w-[22px] h-[52px] rounded-[5px]" style={{ background: '#FAFAFA', boxShadow: 'inset 0 -16px 0 -8px rgba(0,0,0,0.18)' }} />
                        <div className="w-[22px] h-[52px] rounded-[5px]" style={{ background: '#E8920A', boxShadow: 'inset 0 -16px 0 -8px rgba(0,0,0,0.25)' }} />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <div className="font-semibold text-[13.5px] ds-text-primary">{logoUrl ? 'Logo personnalisé' : 'Logo Splitzy par défaut'}</div>
                      <div className="text-[12px] ds-text-tertiary">Affiché sur l'addition et les QR codes · PNG, JPG ou SVG</div>
                      <div className="flex items-center gap-2 mt-1">
                        <label
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12.5px] font-medium cursor-pointer transition-colors hover:ds-bg-subtle"
                          style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: logoUploading ? 'var(--ds-text-tertiary)' : 'var(--ds-text-primary)', opacity: logoUploading ? 0.6 : 1 }}
                        >
                          <Upload size={13} />
                          {logoUploading ? 'Upload…' : 'Télécharger ↑'}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                            className="sr-only"
                            disabled={logoUploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file || !restaurant?._id) return
                              setLogoUploading(true)
                              try {
                                const uploadUrl = await generateUploadUrl()
                                const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file })
                                const { storageId } = await res.json()
                                await setLogoStorageId({ id: restaurant._id, storageId })
                              } catch (err) {
                                console.error('[Logo upload]', err)
                              } finally {
                                setLogoUploading(false)
                                e.target.value = ''
                              }
                            }}
                          />
                        </label>
                        {logoUrl && (
                          <button
                            onClick={async () => {
                              if (!restaurant?._id) return
                              await setLogoStorageId({ id: restaurant._id, storageId: undefined }).catch(() => {})
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors"
                            style={{ background: 'transparent', color: 'var(--ds-text-tertiary)' }}
                          >
                            <X size={13} />
                            Retirer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* General info */}
                <div className="ds-panel">
                  <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
                    <div>
                      <div className="font-bold text-[13.5px] ds-text-primary">Informations générales</div>
                      <div className="text-[12px] ds-text-tertiary mt-0.5">Identité visible par vos convives</div>
                    </div>
                  </div>
                  <div className="px-5 py-5 grid grid-cols-2 gap-4">
                    {[
                      { label: 'Nom du restaurant', key: 'name' as const, placeholder: 'Mon Restaurant', span: false },
                      { label: 'Téléphone', key: 'phone' as const, placeholder: '+33 1 23 45 67 89', span: false },
                      { label: 'Adresse', key: 'address' as const, placeholder: '12 rue de la Paix, Paris', span: true },
                      { label: 'Email professionnel', key: 'email' as const, placeholder: 'contact@restaurant.fr', span: true },
                    ].map(({ label, key, placeholder, span }) => (
                      <div key={key} className={span ? 'col-span-2' : ''}>
                        <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">{label}</label>
                        <input
                          value={form[key]}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full rounded-lg border px-3 py-2 text-[13.5px] outline-none transition-all"
                          style={{
                            background: 'var(--ds-bg-surface)',
                            borderColor: 'var(--ds-border)',
                            color: 'var(--ds-text-primary)',
                            fontSize: '16px',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div
                    className="flex items-center justify-between px-5 py-3 border-t"
                    style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}
                  >
                    <div className="text-[12px] ds-text-tertiary">
                      {saved ? (
                        <span className="ds-text-success font-semibold flex items-center gap-1">
                          <Check size={13} /> Modifications enregistrées
                        </span>
                      ) : null}
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={saving || !restaurant}
                      className="px-4 py-2 rounded-lg text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
                      style={{ background: '#E8920A' }}
                    >
                      {saving ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                  </div>
                </div>

                {/* Type d'établissement */}
                <div className="ds-panel p-5">
                  <div className="font-bold text-[13.5px] ds-text-primary mb-4">Type d'établissement</div>
                  <div className="flex gap-3 flex-wrap">
                    {ESTABLISHMENT_TYPES.map(({ id, icon: Icon, label }) => (
                      <button
                        key={id}
                        onClick={() => setForm(f => ({ ...f, type: id }))}
                        className="flex items-center gap-2 rounded-xl border px-5 py-3 text-[13.5px] font-semibold transition-all"
                        style={{
                          background: form.type === id ? 'var(--ds-accent-soft)' : 'var(--ds-bg-surface)',
                          borderColor: form.type === id ? '#E8920A' : 'var(--ds-border)',
                          color: form.type === id ? 'var(--ds-accent-strong)' : 'var(--ds-text-secondary)',
                        }}
                      >
                        <Icon size={16} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {section === 'notifications' && (
              <div className="ds-panel">
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
                  <div>
                    <div className="font-bold text-[13.5px] ds-text-primary">Notifications</div>
                    <div className="text-[12px] ds-text-tertiary mt-0.5">Choisissez quand être alerté</div>
                  </div>
                </div>
                <div className="px-5 divide-y" style={{ borderColor: 'var(--ds-border)' }}>
                  {[
                    { key: 'negativeFeedback' as const, label: 'Alerte feedback négatif (≤ 3★)', desc: "Soyez notifié immédiatement dès qu'un avis négatif arrive." },
                    { key: 'morningDigest'    as const, label: 'Digest matinal 8h',              desc: 'Résumé de la veille envoyé chaque matin à 8h.' },
                    { key: 'endOfService'     as const, label: 'Rappel fin de service',           desc: 'Notification à la fermeture pour clôturer les sessions.' },
                    { key: 'weeklyRecap'      as const, label: 'Hebdo : récap CA & pourboires',   desc: 'Bilan de la semaine chaque lundi matin.' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-4">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="text-[13.5px] font-semibold ds-text-primary">{label}</div>
                        <div className="text-[12px] ds-text-tertiary mt-0.5">{desc}</div>
                      </div>
                      <Toggle
                        checked={notifs[key]}
                        onChange={(v) => setNotifs((prev) => ({ ...prev, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'pos' && (
              <PosSection
                tables={(rawTables ?? []).map(t => ({ _id: t._id, number: t.number }))}
                restaurantId={restaurantId}
              />
            )}

            {section === 'qr' && (
              rawTables === undefined ? (
                <div className="ds-panel p-12 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#E8920A', borderTopColor: 'transparent' }} />
                </div>
              ) : (
                <QRCodesSection
                  tables={rawTables as { number: number; capacity: number }[]}
                  restaurantSlug={restaurant?.slug ?? ''}
                  restaurantId={restaurantId}
                />
              )
            )}

            {section === 'menu' && (
              <MenuSection restaurantId={restaurantId} />
            )}

            {section === 'tables' && (
              <TablesSection />
            )}

            {section === 'billing' && (
              <BillingSection restaurant={restaurant} />
            )}

            {section === 'team' && (
              <div className="space-y-10">
                <TeamSection restaurantId={restaurantId} />
                <ExtrasSection restaurantId={restaurantId} />
              </div>
            )}

            {section === 'account' && (
              <AccountSection restaurant={restaurant} restaurantId={restaurantId} />
            )}

            {section === 'plan' && (
              <PlanSection restaurantId={restaurantId} />
            )}
          </div>
        </div>
      </main>
    </RestaurantLayout>
  )
}
