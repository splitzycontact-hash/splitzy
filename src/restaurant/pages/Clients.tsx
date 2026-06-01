import { useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'
import { Users, Star, TrendingUp, Search, X, Send, Mail, Crown, Sparkles, ChevronRight, Printer, Download } from 'lucide-react'

type Status = 'vip' | 'regulier' | 'nouveau' | 'insatisfait'
type FilterKey = 'all' | Status

const STATUS_LABEL: Record<Status, string> = {
  vip: 'VIP', regulier: 'Régulier', nouveau: 'Nouveau', insatisfait: 'Insatisfait',
}
const STATUS_STYLE: Record<Status, { bg: string; color: string }> = {
  vip:        { bg: '#FFEAC2',              color: '#92400E'  },
  regulier:   { bg: 'var(--ds-success-soft)', color: 'var(--ds-success-strong)' },
  nouveau:    { bg: '#EEF6FF',              color: '#2563EB'  },
  insatisfait:{ bg: 'var(--ds-error-soft)', color: 'var(--ds-error-strong)'   },
}

interface Customer {
  id: number; first: string; last: string; email: string
  visits: number; avg: number; total: number
  lastVisit: string; lastIso: string
  rating: number; status: Status
  phone: string; split: string
  color: string; text: string
}

const CUSTOMERS: Customer[] = [
  { id:1,  first:'Sophie',    last:'Martin',   email:'sophie.martin@gmail.com',   visits:15, avg:52.40, total:786,  lastVisit:'il y a 2 jours', lastIso:'27 mai', rating:4.8, status:'vip',        phone:'06 12 34 56 78', split:'Par article',  color:'#FFEFD9', text:'#B8730A' },
  { id:2,  first:'Alexandre', last:'Dubois',   email:'alex.dubois@outlook.fr',    visits:12, avg:48.20, total:578,  lastVisit:'il y a 3 jours', lastIso:'26 mai', rating:4.9, status:'vip',        phone:'06 78 12 34 56', split:'Parts égales', color:'#E0F2FE', text:'#0369A1' },
  { id:3,  first:'Camille',   last:'Lefebvre', email:'camille.lf@gmail.com',      visits:8,  avg:31.50, total:252,  lastVisit:'hier',            lastIso:'28 mai', rating:4.6, status:'regulier',   phone:'07 22 11 88 99', split:'Par article',  color:'#FCE7F3', text:'#BE185D' },
  { id:4,  first:'Manon',     last:'Bonnet',   email:'manon.b@yahoo.fr',          visits:9,  avg:41.10, total:370,  lastVisit:'il y a 4 jours', lastIso:'25 mai', rating:4.8, status:'regulier',   phone:'06 55 44 33 22', split:'Par article',  color:'#DCFCE7', text:'#15803D' },
  { id:5,  first:'Thomas',    last:'Bernard',  email:'thomas.bernard@me.com',     visits:7,  avg:28.30, total:198,  lastVisit:'il y a 5 jours', lastIso:'24 mai', rating:4.4, status:'regulier',   phone:'07 89 65 43 21', split:'Parts égales', color:'#EDE9FE', text:'#6D28D9' },
  { id:6,  first:'Léa',       last:'Moreau',   email:'lea.moreau@protonmail.com', visits:4,  avg:22.80, total:91,   lastVisit:'il y a 1 sem.',  lastIso:'22 mai', rating:4.2, status:'regulier',   phone:'06 33 22 11 00', split:'Par article',  color:'#FEF3C7', text:'#B45309' },
  { id:7,  first:'Emma',      last:'Roux',     email:'emma.roux@gmail.com',       visits:6,  avg:34.60, total:208,  lastVisit:'il y a 4 jours', lastIso:'25 mai', rating:4.7, status:'regulier',   phone:'07 11 22 33 44', split:'Par article',  color:'#FCE7F3', text:'#BE185D' },
  { id:8,  first:'Lucas',     last:'Fournier', email:'lfournier@gmail.com',       visits:1,  avg:89.00, total:89,   lastVisit:'il y a 5 jours', lastIso:'24 mai', rating:5.0, status:'vip',        phone:'06 91 82 73 64', split:'Tout payer',   color:'#FEE2E2', text:'#B91C1C' },
  { id:9,  first:'Chloé',     last:'Girard',   email:'chloe.girard@hey.com',      visits:3,  avg:26.40, total:79,   lastVisit:'il y a 6 jours', lastIso:'23 mai', rating:4.3, status:'regulier',   phone:'07 65 54 43 32', split:'Parts égales', color:'#E0E7FF', text:'#4338CA' },
  { id:10, first:'Antoine',   last:'Mercier',  email:'a.mercier@orange.fr',       visits:1,  avg:14.50, total:14.5, lastVisit:'hier',            lastIso:'28 mai', rating:2.0, status:'insatisfait', phone:'06 47 58 69 70', split:'Tout payer',   color:'#FEE2E2', text:'#B91C1C' },
  { id:11, first:'Nathan',    last:'Blanc',    email:'nathan.blanc@gmail.com',    visits:5,  avg:31.20, total:156,  lastVisit:'il y a 12 jours',lastIso:'17 mai', rating:4.5, status:'regulier',   phone:'07 81 92 03 14', split:'Par article',  color:'#DBEAFE', text:'#1D4ED8' },
  { id:12, first:'Inès',      last:'Garcia',   email:'ines.garcia@icloud.com',    visits:2,  avg:18.50, total:37,   lastVisit:'il y a 9 jours', lastIso:'20 mai', rating:4.0, status:'nouveau',    phone:'06 14 25 36 47', split:'Parts égales', color:'#F3E8FF', text:'#7C3AED' },
  { id:13, first:'Hugo',      last:'Petit',    email:'hugo.p@gmail.com',          visits:2,  avg:21.00, total:42,   lastVisit:'il y a 15 jours',lastIso:'14 mai', rating:3.5, status:'nouveau',    phone:'07 28 39 40 51', split:'Tout payer',   color:'#FEF3C7', text:'#B45309' },
  { id:14, first:'Sarah',     last:'Robert',   email:'sarah.robert@me.com',       visits:1,  avg:27.30, total:27.3, lastVisit:'il y a 2 jours', lastIso:'27 mai', rating:5.0, status:'nouveau',    phone:'06 92 81 70 69', split:'Par article',  color:'#DCFCE7', text:'#15803D' },
]

const maxVisits = Math.max(...CUSTOMERS.map(c => c.visits))

function initials(c: Customer) { return (c.first[0] + c.last[0]).toUpperCase() }

function StarRating({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-px">
      {[0,1,2,3,4].map(i => (
        <Star
          key={i} size={size}
          fill={i < Math.floor(rating) ? '#E8920A' : 'none'}
          stroke={i < Math.floor(rating) ? '#E8920A' : 'var(--ds-border-strong)'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  )
}

function CustomerDrawer({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const visits = [
    { date:'27/05', line1:'Table 4 · 2 convives', line2:'Lundi 19h42 · Par article · Pourboire 10%', amount:'54,20€' },
    { date:'18/05', line1:'Table 7 · 4 convives', line2:'Dimanche 13h12 · Parts égales · Pourboire 12%', amount:'42,80€' },
    { date:'02/05', line1:'Table 2 · 2 convives', line2:'Vendredi 20h05 · Par article · Pourboire 10%', amount:'58,30€' },
    { date:'21/04', line1:'Table 4 · 3 convives', line2:'Dimanche 12h54 · Par article · Pourboire 8%', amount:'49,90€' },
    { date:'08/04', line1:'Table 1 · 2 convives', line2:'Samedi 21h18 · Par article · Pourboire 10%', amount:'56,70€' },
  ].slice(0, Math.min(customer.visits, 5))

  const feedbacks = [
    { rating:5, text:"Service impeccable comme toujours. Le tartare était excellent et l'accueil chaleureux.", date:`${customer.lastIso} · Table 4`, badge:'google' },
    { rating:5, text:'Très bon moment, plats savoureux et le système de paiement est génial.', date:'18 mai · Table 7', badge:'google' },
    { rating:4, text:"Très bon repas mais un peu d'attente entre l'entrée et le plat.", date:'02 mai · Table 2', badge:'intercepted' },
  ].slice(0, Math.min(customer.visits, 3))

  const bars = [2, 4, 3, 6]
  const maxBar = Math.max(...bars)

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden border-l"
        style={{ width: '520px', background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}
      >
        {/* Head */}
        <div className="flex items-start justify-between px-5 py-5 border-b flex-shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
          <div className="flex items-start gap-3">
            <div
              className="w-11 h-11 rounded-[10px] flex items-center justify-center font-bold text-[15px] flex-shrink-0"
              style={{ background: customer.color, color: customer.text }}
            >
              {initials(customer)}
            </div>
            <div>
              <div className="font-bold text-[16px] ds-text-primary">{customer.first} {customer.last}</div>
              <div className="text-[12.5px] ds-text-tertiary">{customer.email}</div>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-[3px] rounded-full"
                  style={{ background: STATUS_STYLE[customer.status].bg, color: STATUS_STYLE[customer.status].color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: STATUS_STYLE[customer.status].color }} />
                  {STATUS_LABEL[customer.status]}
                </span>
                <span className="text-[11.5px] ds-text-tertiary">Client depuis avr. 2025</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="ds-text-tertiary hover:ds-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Vue rapide */}
          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-3">Vue rapide</h4>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Visites', value: String(customer.visits), sub: 'depuis 14 mois' },
                { label: 'Total dépensé', value: `${customer.total.toFixed(0)}€`, sub: `panier moy. ${customer.avg.toFixed(2).replace('.', ',')}€`, accent: true },
                { label: 'Note moyenne', value: `${customer.rating.toFixed(1)} ★`, sub: `sur ${Math.min(customer.visits, 8)} feedbacks` },
                { label: 'Mode préféré', value: customer.split, sub: customer.split === 'Par article' ? '82% de ses paiements' : '67% de ses paiements' },
              ].map(tile => (
                <div
                  key={tile.label}
                  className="rounded-[10px] border p-3.5"
                  style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] ds-text-tertiary">{tile.label}</div>
                  <div
                    className="font-bold text-[20px] mt-1 leading-none tabular-nums tracking-[-0.025em]"
                    style={{ color: tile.accent ? 'var(--ds-accent)' : 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}
                  >
                    {tile.value}
                  </div>
                  <div className="text-[11.5px] ds-text-secondary mt-0.5">{tile.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Fréquence */}
          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-3">
              Fréquence des visites · 4 dernières semaines
            </h4>
            <div className="rounded-[10px] border p-3.5" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}>
              <div className="flex items-end justify-between mb-2">
                <span className="text-[11.5px] ds-text-tertiary">Total : {bars.reduce((a,b)=>a+b,0)} visites</span>
                <span className="text-[13px] font-semibold" style={{ color: 'var(--ds-success-strong)' }}>+50% vs mois préc.</span>
              </div>
              <div className="flex items-end gap-1.5 h-12">
                {bars.map((v, i) => (
                  <div key={i} className="flex-1 relative">
                    <div
                      className="rounded-t-[3px] relative"
                      style={{ height: `${(v / maxBar) * 100}%`, background: 'var(--ds-accent-soft)', minHeight: '4px' }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-b-[3px]"
                        style={{ height: '40%', background: '#E8920A', borderRadius: '0 0 3px 3px' }}
                      />
                    </div>
                    <span className="block text-center text-[10px] ds-text-tertiary mt-1">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 mt-1">
                {['S-3','S-2','S-1','Cette sem.'].map(l => (
                  <div key={l} className="flex-1 text-center text-[10px] ds-text-tertiary">{l}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Historique visites */}
          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-2">Historique des visites</h4>
            {visits.map((v, i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--ds-border)' }}>
                <div className="text-[11.5px] ds-text-tertiary w-14 flex-shrink-0 font-mono">{v.date}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium ds-text-primary">{v.line1}</div>
                  <div className="text-[12px] ds-text-secondary mt-0.5">{v.line2}</div>
                </div>
                <div className="font-semibold text-[14px] ds-text-primary tabular-nums">{v.amount}</div>
              </div>
            ))}
            <button className="flex items-center gap-1 mt-2 text-[12.5px] font-medium ds-text-secondary hover:ds-text-primary transition-colors">
              Voir les {customer.visits} visites <ChevronRight size={12} />
            </button>
          </div>

          {/* Feedbacks */}
          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-2">Feedbacks laissés</h4>
            <div className="space-y-2">
              {feedbacks.map((f, i) => (
                <div
                  key={i}
                  className="rounded-[10px] border p-3.5"
                  style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <StarRating rating={f.rating} />
                    <span
                      className="text-[10.5px] font-semibold px-1.5 py-[2px] rounded-[4px]"
                      style={
                        f.badge === 'google'
                          ? { background: 'var(--ds-success-soft)', color: 'var(--ds-success-strong)' }
                          : { background: 'var(--ds-error-soft)', color: 'var(--ds-error-strong)' }
                      }
                    >
                      {f.badge === 'google' ? 'Redirigé Google' : 'Intercepté'}
                    </span>
                  </div>
                  <p className="text-[13px] ds-text-primary leading-[1.5]">"{f.text}"</p>
                  <div className="text-[11px] ds-text-tertiary mt-1.5">{f.date}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-3">Actions</h4>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-semibold text-white"
                style={{ background: '#E8920A' }}
              >
                <Send size={13} />
                Envoyer un message
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border text-[13px] font-medium"
                style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                onClick={() => navigator.clipboard.writeText(customer.email).catch(() => {})}
              >
                <Mail size={13} />
                Copier l'email
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border text-[13px] font-medium"
                style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
              >
                <Crown size={13} />
                Marquer VIP
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export function Clients() {
  const [filter, setFilter]         = useState<FilterKey>('all')
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState<Customer | null>(null)
  const [emailModal, setEmailModal] = useState(false)

  function exportCsv() {
    const header = ['Prénom','Nom','Email','Statut','Visites','Panier moy (€)','Total (€)','Dernière visite','Note']
    const rows = CUSTOMERS.map(c => [
      c.first, c.last, c.email, STATUS_LABEL[c.status],
      c.visits, c.avg.toFixed(2).replace('.', ','), c.total.toFixed(2).replace('.', ','),
      c.lastIso, c.rating.toFixed(1),
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'clients-splitzy.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all',        label: 'Tous',        count: CUSTOMERS.length },
    { key: 'regulier',   label: 'Réguliers',   count: CUSTOMERS.filter(c => c.status === 'regulier').length },
    { key: 'vip',        label: 'VIP',         count: CUSTOMERS.filter(c => c.status === 'vip').length },
    { key: 'nouveau',    label: 'Nouveaux',    count: CUSTOMERS.filter(c => c.status === 'nouveau').length },
    { key: 'insatisfait',label: 'Insatisfaits',count: CUSTOMERS.filter(c => c.status === 'insatisfait').length },
  ]

  const visible = CUSTOMERS.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter
    const matchSearch = !search || `${c.first} ${c.last} ${c.email}`.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const avgRating = (CUSTOMERS.reduce((s, c) => s + c.rating, 0) / CUSTOMERS.length).toFixed(1)
  const avgBasket = (CUSTOMERS.reduce((s, c) => s + c.avg, 0) / CUSTOMERS.length).toFixed(2).replace('.', ',')

  return (
    <RestaurantLayout>
      <PageHeader
        title="Clients"
        subtitle={
          <span>
            {CUSTOMERS.length} clients · {CUSTOMERS.filter(c => c.status === 'regulier').length} réguliers · {CUSTOMERS.filter(c => c.status === 'vip').length} VIP · {CUSTOMERS.filter(c => c.status === 'nouveau').length} nouveaux
          </span>
        }
        actions={
          <>
            <button
              onClick={() => window.print()}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg border text-[13px] font-medium"
              style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', boxShadow: 'var(--ds-shadow-sm)' }}
            >
              <Printer size={14} />
              Imprimer rapport
            </button>
            <button
              onClick={exportCsv}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg border text-[13px] font-medium"
              style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', boxShadow: 'var(--ds-shadow-sm)' }}
            >
              <Download size={14} />
              Exporter CSV
            </button>
            <button
              onClick={() => setEmailModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg text-[13px] font-semibold text-white"
              style={{ background: '#E8920A' }}
            >
              <Mail size={13} />
              Campagne email
            </button>
          </>
        }
      />

      <div className="px-9 py-6 space-y-5">

        {/* KPI grid */}
        <section
          className="grid grid-cols-2 xl:grid-cols-4 border rounded-[12px] overflow-hidden"
          style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
        >
          {[
            { icon: Users,     label: 'Total clients',        value: String(CUSTOMERS.length), sub: '+14 ce mois', up: true },
            { icon: Users,     label: 'Clients réguliers',    value: '23', sub: '+3 · 18% de la base', up: true },
            { icon: TrendingUp, label: 'Panier moyen',        value: `${avgBasket}€`, sub: '+2,40€ vs mois dernier', up: true, accent: true },
            { icon: Star,      label: 'Note moyenne donnée',  value: `${avgRating} ★`, sub: `+0,2 sur ${CUSTOMERS.reduce((s,c)=>s+Math.min(c.visits,8),0)} feedbacks`, up: true },
          ].map((kpi, i) => (
            <div
              key={i}
              className="flex flex-col gap-1 px-5 py-4"
              style={{ borderRight: i < 3 ? `1px solid var(--ds-border)` : 'none' }}
            >
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">
                <kpi.icon size={12} style={{ color: 'var(--ds-text-tertiary)' }} />
                {kpi.label}
              </div>
              <div
                className="font-extrabold tabular-nums leading-none tracking-[-0.025em]"
                style={{ fontSize: '22px', color: kpi.accent ? 'var(--ds-accent)' : 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif', marginTop: '4px' }}
              >
                {kpi.value}
              </div>
              <div className="text-[11.5px] flex items-center gap-1">
                <span className="font-semibold" style={{ color: 'var(--ds-success-strong)' }}>↑ {kpi.sub.split(' ')[0]}</span>
                <span className="ds-text-tertiary">{kpi.sub.split(' ').slice(1).join(' ')}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Insight strip */}
        <div
          className="flex items-start gap-3 px-5 py-4 rounded-[10px] border-l-[3px]"
          style={{
            background: 'var(--ds-bg-surface)',
            border: '1px solid var(--ds-border)',
            borderLeftWidth: '3px',
            borderLeftColor: '#E8920A',
            boxShadow: 'var(--ds-shadow-sm)',
          }}
        >
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--ds-accent-soft)' }}
          >
            <Sparkles size={14} style={{ color: '#E8920A' }} />
          </div>
          <p className="flex-1 text-[13px] ds-text-primary leading-[1.55]">
            <strong>Sophie Martin</strong> et <strong>Alexandre Dubois</strong> ont chacun dépensé plus de 500€ ce mois. Lancez une campagne de fidélité ciblée pour maximiser leur rétention.
          </p>
          <button className="text-[12px] font-semibold flex-shrink-0 ds-text-accent hover:ds-text-accent-strong transition-colors">
            Créer la campagne →
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div
            className="inline-flex rounded-[10px] p-[3px] gap-px border"
            style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
          >
            {FILTERS.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-[7px] text-[12.5px] transition-colors"
                style={{
                  background: filter === key ? 'var(--ds-bg-subtle)' : 'none',
                  color: filter === key ? 'var(--ds-text-primary)' : 'var(--ds-text-secondary)',
                  fontWeight: filter === key ? 600 : 500,
                }}
              >
                {label}
                <span className="text-[11px] tabular-nums ds-text-tertiary">{count}</span>
              </button>
            ))}
          </div>
          <div
            className="flex items-center gap-2 h-8 px-2.5 rounded-lg border w-64"
            style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
          >
            <Search size={13} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un client…"
              className="flex-1 bg-transparent border-none outline-none min-w-0"
              style={{ fontSize: '13px', color: 'var(--ds-text-primary)' }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="ds-panel">
          {/* Header */}
          <div
            className="grid text-[10.5px] font-bold uppercase tracking-[0.07em] px-5 py-2.5"
            style={{
              gridTemplateColumns: '2fr 100px 80px 80px 80px 100px 80px 40px',
              background: 'var(--ds-bg-subtle)',
              color: 'var(--ds-text-tertiary)',
              borderBottom: '1px solid var(--ds-border)',
            }}
          >
            <div>Client</div>
            <div>Statut</div>
            <div>Visites</div>
            <div className="text-right">Panier</div>
            <div className="text-right">Total</div>
            <div>Dernière visite</div>
            <div>Note</div>
            <div />
          </div>

          {/* Rows */}
          {visible.length === 0 ? (
            <div className="py-12 text-center text-[13px] ds-text-tertiary">Aucun client trouvé.</div>
          ) : (
            visible.map((c, i) => (
              <div
                key={c.id}
                className="grid items-center px-5 py-3.5 border-b cursor-pointer transition-colors hover:ds-bg-subtle"
                style={{
                  gridTemplateColumns: '2fr 100px 80px 80px 80px 100px 80px 40px',
                  borderColor: 'var(--ds-border)',
                  background: i % 2 === 1 ? 'var(--ds-bg-base)' : 'var(--ds-bg-surface)',
                }}
                onClick={() => setSelected(c)}
              >
                {/* Client */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center font-bold text-[12px] flex-shrink-0"
                    style={{ background: c.color, color: c.text }}
                  >
                    {initials(c)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[13px] ds-text-primary truncate">{c.first} {c.last}</div>
                    <div className="text-[11.5px] ds-text-tertiary truncate">{c.email}</div>
                  </div>
                </div>
                {/* Status */}
                <div>
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-[3px] rounded-full"
                    style={{ background: STATUS_STYLE[c.status].bg, color: STATUS_STYLE[c.status].color }}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                {/* Visits */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[13px] ds-text-primary tabular-nums">{c.visits}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ds-bg-subtle)', maxWidth: '32px' }}>
                    <div className="h-full rounded-full" style={{ width: `${(c.visits / maxVisits) * 100}%`, background: '#E8920A' }} />
                  </div>
                </div>
                {/* Basket */}
                <div className="text-right font-semibold text-[13px] ds-text-primary tabular-nums">
                  {c.avg.toFixed(2).replace('.', ',')}€
                </div>
                {/* Total */}
                <div className="text-right font-semibold text-[13px] ds-text-accent tabular-nums">
                  {c.total.toFixed(0)}€
                </div>
                {/* Last visit */}
                <div className="text-[12px] ds-text-secondary">{c.lastVisit}</div>
                {/* Rating */}
                <div className="flex items-center gap-1">
                  <Star size={12} fill="#E8920A" stroke="#E8920A" />
                  <span className="font-semibold text-[13px] ds-text-primary tabular-nums">{c.rating.toFixed(1)}</span>
                </div>
                {/* Arrow */}
                <div>
                  <ChevronRight size={15} style={{ color: 'var(--ds-text-tertiary)' }} />
                </div>
              </div>
            ))
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: 'var(--ds-border)' }}>
            <span className="text-[12px] ds-text-tertiary">{visible.length} clients</span>
            <div className="flex items-center gap-1">
              {[1, 2].map(p => (
                <button key={p} className="w-7 h-7 rounded-md text-[12px] font-medium" style={{ background: p === 1 ? '#E8920A' : 'none', color: p === 1 ? 'white' : 'var(--ds-text-secondary)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Campaign email modal */}
      <AnimatePresence>
        {emailModal && (
          <m.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) setEmailModal(false) }}>
            <m.div className="rounded-2xl overflow-hidden w-[400px] max-w-full" style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }} initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
                <span className="font-bold text-[15px] ds-text-primary">Campagne email</span>
                <button onClick={() => setEmailModal(false)} className="ds-text-tertiary hover:ds-text-primary"><X size={16} /></button>
              </div>
              <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--ds-accent-soft)' }}>
                  <Mail size={22} style={{ color: '#E8920A' }} />
                </div>
                <p className="font-semibold text-[14px] ds-text-primary">Phase 2 — Bientôt disponible</p>
                <p className="text-[13px] ds-text-secondary leading-[1.6] max-w-[300px]">
                  Les campagnes email arriveront avec l'intégration Mailgun. Ciblez vos VIP, envoyez des offres personnalisées et mesurez les taux d'ouverture directement depuis Splitzy.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-1">
                  {['Segmentation VIP / Réguliers', 'Templates personnalisables', 'Stats ouverture + clics'].map(tag => (
                    <span key={tag} className="text-[11.5px] px-2.5 py-1 rounded-full border ds-text-secondary" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="px-5 pb-5">
                <button onClick={() => setEmailModal(false)} className="w-full rounded-xl text-sm font-semibold py-2.5" style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-secondary)' }}>Fermer</button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {selected && <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />}
    </RestaurantLayout>
  )
}
