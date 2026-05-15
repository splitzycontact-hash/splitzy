import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useAction } from 'convex/react'
import { useClerk } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import type { Id } from '../../../convex/_generated/dataModel'
import { QRCodeSVG } from 'qrcode.react'
import { Download } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { Topbar } from '../layout/Topbar'
import { useRestaurant, useRestaurantId } from '../context/RestaurantContext'
import { assignEmoji, normalizeCategoryId } from '../../utils/menuEmoji'
import { generateBillingInvoicePDF, downloadAllInvoices, type BillingInvoiceData } from '../../utils/generateBillingInvoice'

type SectionKey = 'restaurant' | 'menu' | 'qr' | 'notifications' | 'pos' | 'billing'

const SUB_NAV: { key: SectionKey; label: string }[] = [
  { key: 'restaurant',    label: 'Votre restaurant' },
  { key: 'menu',          label: 'Votre menu' },
  { key: 'qr',            label: 'QR Codes tables' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'pos',           label: 'Intégrations POS' },
  { key: 'billing',       label: 'Compte & facturation' },
]

const ESTABLISHMENT_TYPES = [
  { id: 'restaurant', emoji: '🍽', label: 'Restaurant' },
  { id: 'bar',        emoji: '🍺', label: 'Bar' },
  { id: 'cafe',       emoji: '☕', label: 'Café' },
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
        if (f.convexField === 'apiKey') prefilled[f.key] = existing.apiKey
        else if (f.convexField === 'locationId') prefilled[f.key] = existing.locationId ?? ''
        else if (f.convexField === 'extraKey') prefilled[f.key] = existing.extraKey ?? ''
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
            <div className="grid grid-cols-3 gap-3">
              {POS_INTEGRATIONS.filter(p => !isConnected(p.id) && p.status !== 'soon').map(pos => (
                <PosCard key={pos.id} pos={pos} connected={false} onClick={() => openModal(pos)} />
              ))}
            </div>
          </div>

          {/* Soon */}
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Bientôt disponibles</div>
            <div className="grid grid-cols-3 gap-3">
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

function QRCodesSection({
  tables, restaurantSlug,
}: {
  tables: { number: number; capacity: number }[]
  restaurantSlug: string
}) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  function downloadSVG(tableNumber: number) {
    const svgEl = document.getElementById(`qr-table-${tableNumber}`)
    if (!svgEl) return
    const svg = svgEl.outerHTML
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-table-${tableNumber}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (tables.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-card p-12 text-center">
        <div className="text-4xl mb-3">🪑</div>
        <div className="text-base font-semibold text-dark">Aucune table configurée</div>
        <div className="text-sm text-muted mt-1">Vos QR codes apparaîtront ici.</div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-border shadow-card p-5">
        <h2 className="text-base font-bold text-dark mb-1">QR Codes de vos tables</h2>
        <p className="text-sm text-muted mb-5">
          Chaque QR code ouvre directement la page de paiement pour la table correspondante.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {tables.map(table => {
            const url = `${baseUrl}/t/${restaurantSlug}/${table.number}`
            return (
              <div key={table.number} className="flex flex-col items-center gap-3 border border-border rounded-xl p-4">
                <div className="text-sm font-bold text-dark">Table {table.number}</div>
                <a href={url} target="_blank" rel="noreferrer" className="bg-white p-2 rounded-lg border border-border hover:border-brand transition-colors">
                  <QRCodeSVG
                    id={`qr-table-${table.number}`}
                    value={url}
                    size={110}
                    level="M"
                    includeMargin={false}
                  />
                </a>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-brand underline text-center break-all px-1 hover:text-brand-dark"
                >
                  Tester le lien →
                </a>
                <button
                  onClick={() => downloadSVG(table.number)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-dark transition-colors"
                >
                  <Download size={12} />
                  Télécharger SVG
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-brand-bg border border-brand/20 rounded-xl p-4 flex items-start gap-3">
        <span className="text-xl shrink-0">💡</span>
        <div className="text-sm text-dark">
          <strong>Comment utiliser ?</strong> Imprimez chaque QR code et posez-le sur la table correspondante. Vos clients scannent, paient et laissent un avis — sans attendre le serveur.
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

const MOCK_INVOICES = [
  { id: 'INV-2025-004', date: '01 avr. 2025', amountCents: 2900, plan: 'Pro', status: 'Payée' },
  { id: 'INV-2025-003', date: '01 mar. 2025', amountCents: 2900, plan: 'Pro', status: 'Payée' },
  { id: 'INV-2025-002', date: '01 fév. 2025', amountCents: 2900, plan: 'Pro', status: 'Payée' },
  { id: 'INV-2025-001', date: '01 jan. 2025', amountCents: 0,    plan: 'Starter', status: 'Gratuit' },
]

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

  const [currentPlan] = useState('starter')
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
      <div className="bg-white rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-bold text-dark">Plan Starter</span>
              <span className="text-[11px] font-semibold bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">Gratuit</span>
            </div>
            <p className="text-xs text-muted">Jusqu'à 5 tables · 100 paiements / mois · QR codes inclus</p>
          </div>
          <button
            onClick={() => setShowPlans(v => !v)}
            className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
          >
            {showPlans ? 'Fermer' : 'Changer de plan'}
          </button>
        </div>
      </div>

      {/* Plans comparison */}
      {showPlans && (
        <div className="bg-white rounded-xl border border-border shadow-card p-6">
          <h3 className="text-base font-bold text-dark mb-5">Choisir un plan</h3>
          <div className="grid grid-cols-3 gap-4">
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
          <button
            onClick={() => downloadAllInvoices(MOCK_INVOICES.map(inv => ({
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
        </div>
        <div className="divide-y divide-border">
          {MOCK_INVOICES.map(inv => {
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

export function Settings() {
  const restaurant = useRestaurant()
  const restaurantId = useRestaurantId()
  const updateRestaurant = useMutation(api.restaurants.update)
  const rawTables = useQuery(api.tables.list, restaurantId ? { restaurantId } : 'skip')

  const [section, setSection] = useState<SectionKey>('restaurant')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
        name: restaurant.name,
        phone: restaurant.phone,
        address: restaurant.address,
        email: restaurant.email,
        type: restaurant.type,
      })
    }
  }, [restaurant?._id])

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
      <Topbar title="Paramètres" subtitle="Gérez votre établissement" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-5 h-full">
          {/* Sub-nav */}
          <aside className="w-[230px] shrink-0">
            <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
              {SUB_NAV.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-border last:border-b-0 transition-colors ${
                    section === key
                      ? 'bg-brand-bg text-brand border-l-[3px] border-l-brand pl-[13px]'
                      : 'text-mid hover:bg-bg border-l-[3px] border-l-transparent pl-[13px]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 space-y-5">
            {section === 'restaurant' && (
              <>
                <div className="bg-white rounded-xl border border-border shadow-card p-6">
                  <h2 className="text-base font-bold text-dark mb-5">Informations générales</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Nom</label>
                      <input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Téléphone</label>
                      <input
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Adresse</label>
                      <input
                        value={form.address}
                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Email professionnel</label>
                      <input
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-border shadow-card p-6">
                  <h2 className="text-base font-bold text-dark mb-4">Type d'établissement</h2>
                  <div className="flex gap-3">
                    {ESTABLISHMENT_TYPES.map(({ id, emoji, label }) => (
                      <button
                        key={id}
                        onClick={() => setForm(f => ({ ...f, type: id }))}
                        className={`flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-all ${
                          form.type === id
                            ? 'bg-brand-bg border-brand text-brand'
                            : 'bg-white border-border text-mid hover:bg-bg'
                        }`}
                      >
                        <span className="text-lg">{emoji}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end items-center gap-3">
                  {saved && (
                    <span className="text-sm text-success font-medium">✓ Modifications enregistrées</span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving || !restaurant}
                    className="bg-brand text-white font-semibold text-sm rounded-xl px-6 py-2.5 hover:bg-brand-dark transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
                  </button>
                </div>
              </>
            )}

            {section === 'notifications' && (
              <div className="bg-white rounded-xl border border-border shadow-card p-6">
                <h2 className="text-base font-bold text-dark mb-5">Notifications</h2>
                <div className="space-y-4">
                  {[
                    { key: 'negativeFeedback' as const, label: 'Alerte feedback négatif (≤ 3★)', desc: "Soyez notifié immédiatement dès qu'un avis négatif arrive." },
                    { key: 'morningDigest'    as const, label: 'Digest matinal 8h',              desc: 'Résumé de la veille envoyé chaque matin à 8h.' },
                    { key: 'endOfService'     as const, label: 'Rappel fin de service',           desc: 'Notification à la fermeture pour clôturer les sessions.' },
                    { key: 'weeklyRecap'      as const, label: 'Hebdo : récap CA & pourboires',   desc: 'Bilan de la semaine chaque lundi matin.' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                      <div>
                        <div className="text-sm font-semibold text-dark">{label}</div>
                        <div className="text-xs text-muted mt-0.5">{desc}</div>
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
              <QRCodesSection
                tables={(rawTables ?? []) as { number: number; capacity: number }[]}
                restaurantSlug={restaurant?.slug ?? ''}
  
              />
            )}

            {section === 'menu' && (
              <MenuSection restaurantId={restaurantId} />
            )}

            {section === 'billing' && (
              <BillingSection restaurant={restaurant} />
            )}
          </div>
        </div>
      </main>
    </RestaurantLayout>
  )
}
