import { useState, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { QRCodeSVG } from 'qrcode.react'
import { Download } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { Topbar } from '../layout/Topbar'
import { useRestaurant, useRestaurantId } from '../context/RestaurantContext'

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

const POS_INTEGRATIONS = [
  { name: 'Lightspeed', badge: 'Recommandé', badgeStyle: 'bg-brand-bg text-brand border-brand/20 border',      status: 'connect'    },
  { name: 'Square',     badge: 'Connecté',   badgeStyle: 'bg-green-50 text-green-700 border-green-200 border', status: 'connected'  },
  { name: 'Zelty',      badge: '',           badgeStyle: '',                                                    status: 'connect'    },
  { name: "L'Addition", badge: '',           badgeStyle: '',                                                    status: 'connect'    },
  { name: 'Manuel CSV', badge: 'Actif',      badgeStyle: 'bg-gray-100 text-gray-600',                          status: 'active'     },
  { name: 'API perso',  badge: 'Bientôt',    badgeStyle: 'bg-gray-100 text-gray-400',                          status: 'soon'       },
]

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
                <div className="bg-white p-2 rounded-lg border border-border">
                  <QRCodeSVG
                    id={`qr-table-${table.number}`}
                    value={url}
                    size={110}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="text-[10px] text-muted text-center break-all px-1">{url}</div>
                <button
                  onClick={() => downloadSVG(table.number)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-dark transition-colors"
                >
                  <Download size={12} />
                  Télécharger
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
              <div className="bg-white rounded-xl border border-border shadow-card p-6">
                <h2 className="text-base font-bold text-dark mb-5">Intégrations POS</h2>
                <div className="grid grid-cols-3 gap-3">
                  {POS_INTEGRATIONS.map((pos) => (
                    <div key={pos.name} className="border border-border rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold text-dark">{pos.name}</span>
                        {pos.badge && (
                          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${pos.badgeStyle}`}>
                            {pos.badge}
                          </span>
                        )}
                      </div>
                      <button
                        className={`text-xs font-semibold rounded-lg py-1.5 transition-colors ${
                          pos.status === 'connected' ? 'bg-green-50 text-green-700 border border-green-200'
                          : pos.status === 'soon'    ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                          : pos.status === 'active'  ? 'bg-gray-100 text-gray-600 border border-gray-200'
                          : 'bg-brand text-white hover:bg-brand-dark'
                        }`}
                        disabled={pos.status === 'soon'}
                      >
                        {pos.status === 'connected' ? '✓ Connecté'
                          : pos.status === 'soon'   ? 'Bientôt disponible'
                          : pos.status === 'active' ? 'Actif'
                          : 'Connecter'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'qr' && (
              <QRCodesSection
                tables={(rawTables ?? []) as { number: number; capacity: number }[]}
                restaurantSlug={restaurant?.slug ?? ''}
  
              />
            )}

            {(section === 'menu' || section === 'billing') && (
              <div className="bg-white rounded-xl border border-border shadow-card p-12 text-center">
                <div className="text-4xl mb-3">🚧</div>
                <div className="text-base font-semibold text-dark">Section en cours de développement</div>
                <div className="text-sm text-muted mt-1">Disponible très prochainement.</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </RestaurantLayout>
  )
}
