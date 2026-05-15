import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useMutation, useQuery } from 'convex/react'
import { useAuth, useUser, useClerk, SignUp } from '@clerk/clerk-react'
import { api } from '../../../convex/_generated/api'
import { ChevronRight, ChevronLeft, Check, QrCode } from 'lucide-react'

const clerkReady = (() => {
  const k = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
  return typeof k === 'string' && k.startsWith('pk_') && k.length > 20
})()

function OnboardingWithClerk() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const clerk = useClerk()
  const restaurant = useQuery(
    api.restaurants.getByClerkId,
    isSignedIn && user ? { clerkUserId: user.id } : 'skip',
  )

  if (!isLoaded || (isSignedIn && restaurant === undefined)) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Already has a restaurant → go to dashboard
  if (isSignedIn && restaurant) {
    return <Navigate to="/restaurant" replace />
  }

  // Signed in but no restaurant → show form
  if (isSignedIn) {
    return (
      <OnboardingForm
        userId={user?.id ?? ''}
        defaultEmail={user?.emailAddresses[0]?.emailAddress ?? ''}
        onBack={() => clerk.signOut({ redirectUrl: '/restaurant/sign-in' })}
      />
    )
  }

  // Not signed in → show Clerk sign-up
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <div className="text-3xl font-black tracking-tight text-dark mb-1">
          Split<span className="text-brand">zy</span>
        </div>
        <div className="text-sm text-muted">Créez votre compte restaurant</div>
      </div>
      <SignUp
        forceRedirectUrl="/restaurant/onboarding"
        appearance={{
          variables: {
            colorPrimary: '#E8920A',
            colorTextOnPrimaryBackground: '#ffffff',
            fontFamily: 'Inter, system-ui, sans-serif',
            borderRadius: '12px',
          },
          elements: {
            card: 'shadow-card border border-border',
            headerTitle: 'font-bold',
          },
        }}
      />
    </div>
  )
}

export function RestaurantOnboarding() {
  if (!clerkReady) return <OnboardingForm userId="dev-user" defaultEmail="" />
  return <OnboardingWithClerk />
}

function OnboardingForm({ userId, defaultEmail, onBack }: { userId: string; defaultEmail: string; onBack?: () => void }) {
  const navigate = useNavigate()
  const createRestaurant = useMutation(api.restaurants.create)
  const createTables = useMutation(api.tables.createBulk)

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: defaultEmail,
    type: 'restaurant' as 'restaurant' | 'bar' | 'cafe',
  })
  const [tableCount, setTableCount] = useState(10)
  const [tableCapacity, setTableCapacity] = useState(4)

  const STEPS = ['Restaurant', 'Tables', 'QR Codes', "C'est parti"]

  function slugify(str: string) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  async function handleFinish() {
    setSaving(true)
    try {
      const slug = slugify(form.name) || 'mon-restaurant'
      const restaurantId = await createRestaurant({
        name: form.name,
        slug,
        address: form.address,
        phone: form.phone,
        email: form.email,
        type: form.type,
        clerkUserId: userId,
      })
      await createTables({ restaurantId, count: tableCount, capacity: tableCapacity })
      navigate('/restaurant', { replace: true })
    } finally {
      setSaving(false)
    }
  }

  const step1Valid = form.name.trim() && form.address.trim() && form.phone.trim() && form.email.trim()

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-border">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-dark transition-colors"
            >
              <ChevronLeft size={16} />
              Retour
            </button>
          )}
          <div className="text-2xl font-black tracking-tight text-dark">
            Split<span className="text-brand">zy</span>
          </div>
        </div>
        <div className="text-xs text-muted">
          Besoin d'aide ?{' '}
          <a href="mailto:splitzy.contact@gmail.com" className="text-brand underline">
            Contactez-nous
          </a>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-10">
        {/* Stepper */}
        <div className="flex items-start mb-10">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-start">
              <div className="flex flex-col items-center gap-1.5" style={{ width: 100 }}>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                    i < step
                      ? 'bg-green-500 border-green-500 text-white'
                      : i === step
                      ? 'bg-brand border-brand text-white'
                      : 'bg-white border-border text-muted'
                  }`}
                >
                  {i < step ? <Check size={16} /> : i + 1}
                </div>
                <span className={`text-xs text-center leading-tight ${i === step ? 'text-dark font-semibold' : 'text-muted'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 mt-[18px] ${i < step ? 'bg-green-500' : 'bg-border'}`}
                  style={{ width: 40 }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="w-full max-w-xl bg-white rounded-2xl border border-border shadow-sm p-8">
          <div className="text-xs font-semibold text-brand uppercase tracking-wider mb-1">
            Étape {step + 1} sur 4
          </div>

          {step === 0 && (
            <Step1
              form={form}
              onChange={(patch) => setForm(f => ({ ...f, ...patch }))}
            />
          )}
          {step === 1 && (
            <Step2
              tableCount={tableCount}
              tableCapacity={tableCapacity}
              onCountChange={setTableCount}
              onCapacityChange={setTableCapacity}
            />
          )}
          {step === 2 && <Step3 restaurantName={form.name} />}
          {step === 3 && (
            <Step4 form={form} tableCount={tableCount} tableCapacity={tableCapacity} />
          )}

          {/* Nav buttons */}
          <div className="flex items-center gap-3 mt-8">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-mid hover:bg-bg transition-colors"
              >
                <ChevronLeft size={16} />
                Retour
              </button>
            )}
            <div className="flex-1" />
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={step === 0 && !step1Valid}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Étape suivante
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Création…
                  </>
                ) : (
                  <>
                    Accéder au tableau de bord
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="text-xs text-muted mt-6">⏱ 4 min · puis vous êtes opérationnel</div>
      </div>
    </div>
  )
}

type FormState = {
  name: string
  address: string
  phone: string
  email: string
  type: 'restaurant' | 'bar' | 'cafe'
}

function Step1({ form, onChange }: { form: FormState; onChange: (p: Partial<FormState>) => void }) {
  return (
    <>
      <h1 className="text-2xl font-bold text-dark mb-1">Dites-nous qui vous êtes</h1>
      <p className="text-sm text-muted mb-6">
        Ces informations apparaîtront sur les reçus Splitzy de vos clients.
      </p>
      <div className="space-y-4">
        <Field label="Nom du restaurant">
          <input
            type="text"
            placeholder="Le Comptoir Parisien"
            autoComplete="off"
            value={form.name}
            onChange={e => onChange({ name: e.target.value })}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </Field>
        <Field label="Adresse">
          <input
            type="text"
            placeholder="12 rue de Rivoli, 75004 Paris"
            autoComplete="off"
            value={form.address}
            onChange={e => onChange({ address: e.target.value })}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Téléphone">
            <input
              type="tel"
              placeholder="01 42 33 44 55"
              autoComplete="off"
              value={form.phone}
              onChange={e => onChange({ phone: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </Field>
          <Field label="Email professionnel">
            <input
              type="email"
              placeholder="gerant@restaurant.fr"
              autoComplete="off"
              value={form.email}
              onChange={e => onChange({ email: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </Field>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Type d'établissement
          </div>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: 'restaurant', label: 'Restaurant', emoji: '🍽' },
              { value: 'bar', label: 'Bar', emoji: '🍺' },
              { value: 'cafe', label: 'Café', emoji: '☕' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ type: opt.value })}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  form.type === opt.value
                    ? 'border-brand bg-brand-bg text-brand'
                    : 'border-border bg-white text-dark hover:border-brand/40'
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function Step2({
  tableCount, tableCapacity, onCountChange, onCapacityChange,
}: {
  tableCount: number
  tableCapacity: number
  onCountChange: (n: number) => void
  onCapacityChange: (n: number) => void
}) {
  return (
    <>
      <h1 className="text-2xl font-bold text-dark mb-1">Vos tables</h1>
      <p className="text-sm text-muted mb-6">
        Splitzy créera un espace digital pour chaque table. Vous pourrez en ajouter plus tard.
      </p>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">Nombre de tables</span>
            <span className="text-xl font-bold text-dark">{tableCount}</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={tableCount}
            onChange={e => onCountChange(Number(e.target.value))}
            className="w-full accent-brand"
          />
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>1</span><span>50</span>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Capacité moyenne par table
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[2, 4, 6].map(cap => (
              <button
                key={cap}
                type="button"
                onClick={() => onCapacityChange(cap)}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  tableCapacity === cap
                    ? 'border-brand bg-brand-bg text-brand'
                    : 'border-border bg-white text-dark hover:border-brand/40'
                }`}
              >
                {cap} pers.
              </button>
            ))}
          </div>
        </div>
        <div className="bg-bg rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🪑</span>
          <div>
            <div className="text-sm font-semibold text-dark">
              {tableCount} tables · {tableCount * tableCapacity} couverts max
            </div>
            <div className="text-xs text-muted">Modifiable à tout moment dans Paramètres</div>
          </div>
        </div>
      </div>
    </>
  )
}

function Step3({ restaurantName }: { restaurantName: string }) {
  return (
    <>
      <h1 className="text-2xl font-bold text-dark mb-1">Vos QR Codes</h1>
      <p className="text-sm text-muted mb-6">
        Splitzy génère un QR code unique par table. Vos clients scannent, paient et laissent un avis — sans attendre.
      </p>
      <div className="space-y-4">
        <div className="bg-bg rounded-2xl p-6 flex flex-col items-center gap-4">
          <div className="w-24 h-24 bg-white rounded-xl border border-border flex items-center justify-center shadow-sm">
            <QrCode size={52} className="text-dark" />
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-dark">QR Code · Table 1</div>
            <div className="text-xs text-muted mt-0.5">{restaurantName || 'Votre restaurant'}</div>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { icon: '📥', text: 'Téléchargez vos QR codes en PDF depuis Paramètres' },
            { icon: '🖨', text: 'Imprimez-les et posez-les sur chaque table' },
            { icon: '✅', text: 'Vos clients paient en autonomie, vous encaissez en temps réel' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-bg">
              <span className="text-base shrink-0">{item.icon}</span>
              <span className="text-sm text-dark">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function Step4({ form, tableCount, tableCapacity }: { form: FormState; tableCount: number; tableCapacity: number }) {
  return (
    <div className="flex flex-col items-center text-center py-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <Check size={32} className="text-green-600" />
      </div>
      <h1 className="text-2xl font-bold text-dark mb-2">C'est parti ! 🎉</h1>
      <p className="text-sm text-muted mb-6 max-w-xs">
        Tout est prêt.{form.name && <> <strong className="text-dark">{form.name}</strong> est sur Splitzy.</>} Vos {tableCount} tables sont configurées.
      </p>
      <div className="w-full bg-bg rounded-xl p-4 text-left space-y-2">
        <SummaryRow label="Restaurant" value={form.name} />
        <SummaryRow label="Adresse" value={form.address} />
        <SummaryRow label="Tables" value={`${tableCount} tables · ${tableCapacity} pers/table`} />
        <SummaryRow label="Type" value={{ restaurant: 'Restaurant 🍽', bar: 'Bar 🍺', cafe: 'Café ☕' }[form.type]} />
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">{label}</div>
      {children}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-dark">{value || '—'}</span>
    </div>
  )
}
