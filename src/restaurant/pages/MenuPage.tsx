import { useState, useRef, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import type { Id } from '../../../convex/_generated/dataModel'
import { AnimatePresence, m } from 'framer-motion'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'
import { useRestaurantId, useRestaurant } from '../context/RestaurantContext'
import { suggestEmoji } from '../lib/foodEmoji'
import { EmojiPicker } from '../components/EmojiPicker'
import {
  Search, Plus, Download, ChevronDown, MoreHorizontal,
  Clock, BarChart3, AlertCircle,
  Check, Printer, X, Pencil, Copy, Trash2,
} from 'lucide-react'

/* ── Types ──────────────────────────────────────────────────────── */

type FilterKey = 'all' | 'ok' | 'out'

type ConvexItem = {
  _id: Id<'menuItems'>
  name: string
  category: string
  priceCents: number
  emoji: string
  description?: string
  isAvailable?: boolean
  isDailySpecial?: boolean
  tags?: string[]
}

/* ── Constants ──────────────────────────────────────────────────── */

// Canonical keys — lowercase, ACCENT-FREE — always stored in Convex in this form.
// Accent-insensitivity merges "Entrées" / "entrees" / "ENTRÉES" into one bucket.
const CATEGORY_KEYS = ['entrees', 'plats', 'desserts', 'boissons']

// Display label (capitalized, accented) per canonical key
const CATEGORY_DISPLAY: Record<string, string> = {
  entrees: 'Entrées', plats: 'Plats', desserts: 'Desserts', boissons: 'Boissons',
}

const CATEGORY_EMOJI: Record<string, string> = {
  entrees: '🥗', plats: '🍽', desserts: '🍮', boissons: '🍷',
}

// Normalize any raw category value to the canonical accent-free lowercase key
function normalizeCategory(raw: string): string {
  return deaccent(raw.toLowerCase().trim())
}

// Display a category key with proper capitalisation
function displayCategory(key: string): string {
  return CATEGORY_DISPLAY[key] ?? (key.charAt(0).toUpperCase() + key.slice(1))
}

const TAG_OPTIONS = [
  { id: 'signature', label: '⭐ Signature', bg: '#FFF4E5', color: '#B8730A' },
  { id: 'vg',        label: '🌿 VG',        bg: '#D1FAE5', color: '#15803D' },
  { id: 'vegan',     label: '🌱 Vegan',     bg: '#ECFDF5', color: '#065F46' },
  { id: 'spicy',     label: '🌶 Piquant',   bg: '#FEF2F2', color: '#B91C1C' },
  { id: 'meat',      label: '🥩 Viande',    bg: '#FEF3C7', color: '#92400E' },
  { id: 'fish',      label: '🐟 Poisson',   bg: '#EFF6FF', color: '#2563EB' },
  { id: 'saison',    label: '🍃 Saison',    bg: '#F0FDF4', color: '#15803D' },
]
const TAG_MAP = Object.fromEntries(TAG_OPTIONS.map(t => [t.id, t]))

// Strip accents/diacritics for robust, accent-insensitive matching
function deaccent(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Map any raw tag value (FR/EN/variants) to a canonical UI tag id
function normalizeTag(raw: string): string {
  const t = deaccent(raw.toLowerCase().trim())
  if (['signature', 'star', 'chef'].includes(t)) return 'signature'
  if (['vg', 'veg', 'vegetarien', 'veggie', 'vege'].includes(t)) return 'vg'
  if (['vegan', 'vegetalien', 'vegetalienne'].includes(t)) return 'vegan'
  if (['spicy', 'piquant', 'epice', 'epicee', 'hot'].includes(t)) return 'spicy'
  if (['meat', 'viande', 'carne'].includes(t)) return 'meat'
  if (['fish', 'poisson', 'seafood', 'fruits de mer', 'fruits_de_mer'].includes(t)) return 'fish'
  if (['saison', 'seasonal', 'de saison', 'de_saison'].includes(t)) return 'saison'
  return t
}

// Demo data for empty-state display (no Convex items yet)
const DEMO_ITEMS: { category: string; items: { name: string; desc: string; price: string; flag?: string }[] }[] = [
  { category: 'Entrées',  items: [{ name: 'Momos Poulet', desc: '8 pièces vapeur · gingembre, coriandre', price: '8,90€', flag: 'signature' }, { name: 'Nems Boeuf', desc: '4 rouleaux frits · lemongrass', price: '7,90€', flag: 'spicy' }] },
  { category: 'Plats',    items: [{ name: 'Pad thaï crevettes', desc: 'Nouilles wokées · cacahuètes', price: '14,90€', flag: 'vg' }, { name: 'Bo bun boeuf', desc: 'Vermicelle · boeuf grillé · nem', price: '13,90€', flag: 'signature' }] },
  { category: 'Desserts', items: [{ name: 'Mochi glacés (3 pièces)', desc: 'Matcha, sésame noir, mangue', price: '6,50€' }] },
  { category: 'Boissons', items: [{ name: 'Thé vert japonais', desc: 'Sencha bio · service pour 2', price: '5,50€', flag: 'vg' }] },
]
const DEMO_FLAG_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  signature: { bg: '#FFF4E5', color: '#B8730A', label: '★ Signature' },
  vg:        { bg: '#D1FAE5', color: '#15803D', label: 'VG' },
  spicy:     { bg: '#FEF2F2', color: '#B91C1C', label: 'PIQUANT' },
}

/* ── Helpers ────────────────────────────────────────────────────── */

function priceFmt(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€'
}

const EMOJI_RE = /\p{Extended_Pictographic}/u

// "OUI"/"oui"/"1"/"true"/"disponible" → true (accent-insensitive)
function isYes(v: string): boolean {
  const t = deaccent(v.toLowerCase().trim())
  return ['oui', 'yes', 'y', 'o', '1', 'true', 'vrai', 'x', 'disponible', 'actif', 'active'].includes(t)
}

// Any value that reads as a boolean (used for content-based column detection)
function isBoolLike(v: string): boolean {
  const t = deaccent(v.toLowerCase().trim())
  return ['oui', 'non', 'yes', 'no', 'y', 'n', 'o', '1', '0', 'true', 'false', 'vrai', 'faux',
    'disponible', 'indisponible', 'actif', 'inactif'].includes(t)
}

// Tolerant price parser → euros as float, or null. Handles "12", "12.90", "12,90",
// "12.90 €", "1.200,50" (EU), "1,200.50" (US). Integer prices are valid.
function parsePrice(raw: string): number | null {
  let s = raw.replace(/[^\d.,-]/g, '').trim()
  if (!s || !/\d/.test(s)) return null
  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (s.includes(',')) {
    s = s.replace(',', '.')
  }
  const n = parseFloat(s)
  return isFinite(n) ? n : null
}

// Positional CSV parser — auto-detects , ; or tab, strips BOM, handles quoted fields
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const clean = text.replace(/^﻿/, '')
  const lines = clean.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return { headers: [], rows: [] }

  // Whichever of , ; \t appears most on the header line is the delimiter
  const first = lines[0]
  const counts: [string, number][] = [
    [',', (first.match(/,/g) || []).length],
    [';', (first.match(/;/g) || []).length],
    ['\t', (first.match(/\t/g) || []).length],
  ]
  const sep = counts.sort((a, b) => b[1] - a[1])[0][0]

  const splitRow = (line: string): string[] => {
    const out: string[] = []
    let cur = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++ }
        else q = !q
      } else if (ch === sep && !q) {
        out.push(cur.trim()); cur = ''
      } else {
        cur += ch
      }
    }
    out.push(cur.trim())
    return out
  }

  return { headers: splitRow(lines[0]), rows: lines.slice(1).map(splitRow) }
}

/* ── Column resolution — header aliases first, then content scoring ── */

type ColMap = {
  name: number; prix: number; categorie: number; dispo: number; emoji: number
  description: number; tags: number; allergenes: number
  bSignature: number; bVeg: number; bSaison: number
}

const ALIASES: Record<keyof ColMap, string[]> = {
  name:        ['nom', 'name', 'article', 'plat', 'libelle', 'intitule', 'produit', 'item', 'titre', 'title', 'designation', 'denomination'],
  prix:        ['prix', 'price', 'tarif', 'prix_eur', 'prixeur', 'prix_ttc', 'montant', 'amount', 'pu', 'prix_unitaire'],
  categorie:   ['categorie', 'category', 'cat', 'rubrique', 'famille', 'section', 'type', 'groupe'],
  dispo:       ['disponibilite', 'disponible', 'dispo', 'available', 'actif', 'active', 'en_stock', 'stock', 'visible', 'statut', 'status'],
  emoji:       ['emoji', 'icone', 'icon', 'pictogramme', 'picto', 'symbole'],
  description: ['description', 'desc', 'descriptif', 'detail', 'details', 'ingredients', 'composition', 'commentaire', 'note'],
  tags:        ['tags', 'tag', 'badges', 'labels', 'etiquettes', 'mots_cles'],
  allergenes:  ['allergenes', 'allergens', 'allergie', 'allergies', 'allergenes_libres'],
  bSignature:  ['badge_signature', 'signature', 'is_signature', 'specialite'],
  bVeg:        ['badge_vegetarien', 'vegetarien', 'veggie', 'vege'],
  bSaison:     ['badge_saison', 'saison', 'seasonal', 'de_saison'],
}

function resolveColumns(headers: string[], rows: string[][]): ColMap {
  const norm = headers.map(h => deaccent(h.toLowerCase().trim()).replace(/['']/g, "'").replace(/\s+/g, '_'))
  const used = new Set<number>()
  const map: ColMap = {
    name: -1, prix: -1, categorie: -1, dispo: -1, emoji: -1,
    description: -1, tags: -1, allergenes: -1, bSignature: -1, bVeg: -1, bSaison: -1,
  }

  // 1) Header-alias pass
  ;(Object.keys(ALIASES) as (keyof ColMap)[]).forEach(field => {
    const aliases = ALIASES[field]
    const idx = norm.findIndex((h, i) => !used.has(i) && aliases.includes(h))
    if (idx >= 0) { map[field] = idx; used.add(idx) }
  })

  // 2) Content scoring for unresolved fields
  const sample = (i: number) => rows.map(r => (r[i] ?? '').trim()).filter(Boolean)
  const frac = (cells: string[], pred: (c: string) => boolean) =>
    cells.length ? cells.filter(pred).length / cells.length : 0
  const bestUnused = (score: (cells: string[]) => number, min: number): number => {
    let best = -1, bestScore = min
    norm.forEach((_, i) => {
      if (used.has(i)) return
      const s = score(sample(i))
      if (s > bestScore) { bestScore = s; best = i }
    })
    if (best >= 0) used.add(best)
    return best
  }

  if (map.prix === -1)
    map.prix = bestUnused(c => frac(c, x => parsePrice(x) !== null), 0.6)
  if (map.dispo === -1)
    map.dispo = bestUnused(c => frac(c, isBoolLike), 0.7)
  if (map.emoji === -1)
    map.emoji = bestUnused(c => frac(c, x => EMOJI_RE.test(x)), 0.5)
  if (map.categorie === -1)
    map.categorie = bestUnused(c => {
      if (!c.length) return 0
      const distinct = new Set(c.map(v => deaccent(v.toLowerCase()))).size
      const kw = frac(c, x => /entr|plat|dessert|boisson|drink|starter|main|menu/.test(deaccent(x.toLowerCase())))
      const lowCard = distinct <= Math.max(6, Math.ceil(c.length / 3)) ? 0.5 : 0
      return kw * 0.6 + lowCard
    }, 0.3)
  if (map.description === -1)
    map.description = bestUnused(c => {
      const avg = c.reduce((s, x) => s + x.length, 0) / (c.length || 1)
      return avg >= 25 ? Math.min(avg / 100, 1) : 0
    }, 0.2)
  if (map.name === -1) {
    map.name = bestUnused(c => {
      if (!c.length) return 0
      const idLike = frac(c, x => /^[a-z]?\d+$/i.test(x))
      const numeric = frac(c, x => parsePrice(x) !== null && /^[\d.,€\s]+$/.test(x))
      if (idLike > 0.5 || numeric > 0.5) return 0
      const distinct = new Set(c.map(v => v.toLowerCase())).size / c.length
      const avg = c.reduce((s, x) => s + x.length, 0) / c.length
      return distinct * 0.6 + Math.min(avg / 30, 1) * 0.4
    }, 0.2)
    if (map.name === -1) {
      const firstUnused = norm.findIndex((_, i) => !used.has(i))
      if (firstUnused >= 0) { map.name = firstUnused; used.add(firstUnused) }
    }
  }

  return map
}

/* ── Toggle ─────────────────────────────────────────────────────── */

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
      style={{ background: on ? '#E8920A' : 'var(--ds-border-strong)' }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform"
        style={{ transform: on ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

/* ── Live CategorySection (Convex items) ───────────────────────── */

type CatSectionProps = {
  categoryName: string
  items: ConvexItem[]
  filter: FilterKey
  onAdd: () => void
  onEdit: (item: ConvexItem) => void
  onDuplicate: (item: ConvexItem) => void
  onDeleteRequest: (item: ConvexItem) => void
  onToggle: (item: ConvexItem) => void
  onToggleSpecial: (item: ConvexItem) => void
}

function LiveCategorySection({ categoryName, items, filter, onAdd, onEdit, onDuplicate, onDeleteRequest, onToggle, onToggleSpecial }: CatSectionProps) {
  const [open, setOpen]     = useState(true)
  const [menuId, setMenuId] = useState<string | null>(null)
  const menuRef             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuId) return
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuId])

  const visible = items.filter(item => {
    const avail = item.isAvailable !== false
    if (filter === 'ok')  return avail
    if (filter === 'out') return !avail
    return true
  })

  return (
    <div className="ds-panel !overflow-visible">
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer border-b"
        style={{ borderColor: open ? 'var(--ds-border)' : 'transparent' }}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2.5">
          <ChevronDown size={14} style={{ color: 'var(--ds-text-tertiary)', transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 150ms' }} />
          <span className="font-bold text-[14px] ds-text-primary">{displayCategory(categoryName)}</span>
          <span className="text-[11px] font-medium px-2 py-[2px] rounded-full" style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-secondary)' }}>
            {items.length} article{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onAdd() }}
          className="inline-flex items-center gap-1 text-[12.5px] font-medium ds-text-accent hover:ds-text-accent-strong transition-colors"
        >
          <Plus size={12} />
          Ajouter
        </button>
      </div>

      {open && (
        <div>
          {visible.length === 0 ? (
            <div className="py-8 text-center text-[13px] ds-text-tertiary">Aucun article pour ce filtre.</div>
          ) : visible.map(item => {
            const avail = item.isAvailable !== false
            return (
              <div
                key={item._id}
                className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0 transition-colors hover:ds-bg-subtle"
                style={{ borderColor: 'var(--ds-border)', opacity: avail ? 1 : 0.6 }}
              >
                {/* Thumb */}
                <div className="w-10 h-10 rounded-[8px] flex items-center justify-center text-[18px] flex-shrink-0" style={{ background: 'var(--ds-bg-subtle)' }}>
                  {item.emoji || suggestEmoji(item.name, normalizeCategory(item.category ?? 'plats'))}
                </div>

                {/* Name + tags + desc */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[13.5px] ds-text-primary">{item.name}</span>
                    {(item.tags ?? []).map(tag => {
                      const t = TAG_MAP[normalizeTag(tag)]
                      return t ? (
                        <span key={tag} className="text-[10.5px] font-semibold px-1.5 py-[2px] rounded-[4px]" style={{ background: t.bg, color: t.color }}>
                          {t.label}
                        </span>
                      ) : null
                    })}
                    {item.isDailySpecial && (
                      <span className="text-[10.5px] font-semibold px-1.5 py-[2px] rounded-[4px] border" style={{ background: '#FEF3C7', color: '#B8730A', borderColor: '#FDE68A' }}>
                        ⭐ SPÉCIAL
                      </span>
                    )}
                    {!avail && (
                      <span className="text-[10.5px] font-semibold px-1.5 py-[2px] rounded-[4px] border" style={{ background: '#FEE2E2', color: '#B91C1C', borderColor: '#FCA5A5' }}>
                        RUPTURE
                      </span>
                    )}
                  </div>
                  {item.description && <div className="text-[12px] ds-text-tertiary mt-0.5 truncate">{item.description}</div>}
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0 min-w-[64px]">
                  <div className="font-bold text-[14px] ds-text-primary tabular-nums">{priceFmt(item.priceCents)}</div>
                </div>

                {/* Toggle plat du jour */}
                <div className="flex items-center gap-1.5 flex-shrink-0" title="Mettre en avant comme plat du jour">
                  <Toggle on={!!item.isDailySpecial} onChange={() => onToggleSpecial(item)} />
                  <span className="text-[11.5px] w-12" style={{ color: item.isDailySpecial ? '#B8730A' : 'var(--ds-text-tertiary)' }}>⭐ Spécial</span>
                </div>

                {/* Toggle disponibilité */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Toggle on={avail} onChange={() => onToggle(item)} />
                  <span className="text-[11.5px] ds-text-tertiary w-10">{avail ? 'Dispo.' : 'Rupture'}</span>
                </div>

                {/* Context menu */}
                <div
                  className="relative flex-shrink-0"
                  ref={menuId === item._id ? menuRef : undefined}
                >
                  <button
                    onClick={() => setMenuId(id => id === item._id ? null : item._id)}
                    className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-colors hover:ds-bg-subtle"
                    style={{ color: 'var(--ds-text-tertiary)' }}
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  {menuId === item._id && (
                    <div
                      className="absolute right-0 top-8 z-50 w-44 rounded-[10px] border py-1"
                      style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.14)' }}
                    >
                      <button
                        onClick={() => { onEdit(item); setMenuId(null) }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-left transition-colors hover:ds-bg-subtle"
                        style={{ color: 'var(--ds-text-primary)' }}
                      >
                        <Pencil size={13} style={{ color: 'var(--ds-text-tertiary)' }} />
                        Modifier
                      </button>
                      <button
                        onClick={() => { onDuplicate(item); setMenuId(null) }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-left transition-colors hover:ds-bg-subtle"
                        style={{ color: 'var(--ds-text-primary)' }}
                      >
                        <Copy size={13} style={{ color: 'var(--ds-text-tertiary)' }} />
                        Dupliquer
                      </button>
                      <div className="my-1 h-px mx-3" style={{ background: 'var(--ds-border)' }} />
                      <button
                        onClick={() => { onDeleteRequest(item); setMenuId(null) }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-left transition-colors hover:bg-red-50"
                        style={{ color: 'var(--ds-error)' }}
                      >
                        <Trash2 size={13} />
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Demo CategorySection (no Convex items yet) ─────────────────── */

function DemoCategorySection({ cat, onAdd }: { cat: typeof DEMO_ITEMS[0]; onAdd: () => void }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="ds-panel overflow-visible" style={{ opacity: 0.75 }}>
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer border-b"
        style={{ borderColor: open ? 'var(--ds-border)' : 'transparent' }}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2.5">
          <ChevronDown size={14} style={{ color: 'var(--ds-text-tertiary)', transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 150ms' }} />
          <span className="font-bold text-[14px] ds-text-primary">{cat.category}</span>
          <span className="text-[11px] font-medium px-2 py-[2px] rounded-full" style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-secondary)' }}>
            {cat.items.length} articles · démo
          </span>
        </div>
        <button onClick={e => { e.stopPropagation(); onAdd() }} className="inline-flex items-center gap-1 text-[12.5px] font-medium ds-text-accent hover:ds-text-accent-strong transition-colors">
          <Plus size={12} />
          Ajouter
        </button>
      </div>
      {open && (
        <div>
          {cat.items.map((item, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--ds-border)' }}>
              <div className="w-10 h-10 rounded-[8px] flex items-center justify-center text-[18px] flex-shrink-0" style={{ background: 'var(--ds-bg-subtle)' }}>
                {CATEGORY_EMOJI[normalizeCategory(cat.category)] ?? '🍽'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[13.5px] ds-text-primary">{item.name}</span>
                  {item.flag && DEMO_FLAG_STYLE[item.flag] && (
                    <span className="text-[10.5px] font-semibold px-1.5 py-[2px] rounded-[4px]" style={{ background: DEMO_FLAG_STYLE[item.flag].bg, color: DEMO_FLAG_STYLE[item.flag].color }}>
                      {DEMO_FLAG_STYLE[item.flag].label}
                    </span>
                  )}
                </div>
                <div className="text-[12px] ds-text-tertiary mt-0.5 truncate">{item.desc}</div>
              </div>
              <div className="font-bold text-[14px] ds-text-primary tabular-nums flex-shrink-0">{item.price}</div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Toggle on={true} onChange={() => {}} />
                <span className="text-[11.5px] ds-text-tertiary w-10">Dispo.</span>
              </div>
              <button className="w-7 h-7 rounded-[7px] flex items-center justify-center" style={{ color: 'var(--ds-text-tertiary)', opacity: 0.4 }}>
                <MoreHorizontal size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────── */

export function MenuPage() {
  const [filter, setFilter]             = useState<FilterKey>('all')
  const [search, setSearch]             = useState('')

  // Shared add/edit modal
  const [modalMode, setModalMode]       = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget]     = useState<ConvexItem | null>(null)
  const [formName, setFormName]         = useState('')
  const [formCategory, setFormCategory] = useState('Entrées')
  const [formPrice, setFormPrice]       = useState('')
  const [formDesc, setFormDesc]         = useState('')
  const [formAvail, setFormAvail]       = useState(true)
  const [formTags, setFormTags]         = useState<Set<string>>(new Set())
  const [formLoading, setFormLoading]   = useState(false)
  // Emoji : auto-suggéré tant que le gérant n'a pas choisi manuellement (emojiTouched).
  const [formEmoji, setFormEmoji]       = useState('🍽️')
  const [emojiTouched, setEmojiTouched] = useState(false)
  const [emojiOpen, setEmojiOpen]       = useState(false)
  const emojiBtnRef                     = useRef<HTMLButtonElement>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget]   = useState<ConvexItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // CSV import
  const [csvLoading, setCsvLoading]     = useState(false)
  const fileRef                         = useRef<HTMLInputElement>(null)

  const restaurantId = useRestaurantId()
  const restaurant   = useRestaurant()
  const rawItems   = useQuery(api.menuItems.listByRestaurant, restaurantId ? { restaurantId } : 'skip')
  const rawPayments = useQuery(api.payments.list, restaurantId ? { restaurantId } : 'skip')
  const ca28 = useMemo(() => {
    const cutoff = Date.now() - 28 * 24 * 60 * 60 * 1000
    return ((rawPayments ?? []) as { totalCents: number; createdAt: number; status: string }[])
      .filter(p => p.status === 'Encaissé' && p.createdAt >= cutoff)
      .reduce((s, p) => s + p.totalCents, 0) / 100
  }, [rawPayments])
  const addItemMut = useMutation(api.menuItems.addItem)
  const updateItem = useMutation(api.menuItems.updateItem)
  const deleteItem = useMutation(api.menuItems.deleteItem)
  const toggleSpecialMut = useMutation(api.menuItems.toggleDailySpecial)
  const updateSpecialMessageMut = useMutation(api.restaurants.updateSpecialMessage)

  function saveSpecialMessage(message: string) {
    if (!restaurantId) return
    updateSpecialMessageMut({ restaurantId, message })
      .catch(err => console.error('[MenuPage] updateSpecialMessage failed:', err))
  }

  const convexItems = (rawItems ?? []) as ConvexItem[]
  const hasLive     = convexItems.length > 0

  // Group by normalized (lowercase) category — merges "Entrées" + "entrees" + "ENTRÉES"
  const byCategory = convexItems.reduce<Record<string, ConvexItem[]>>((acc, item) => {
    const c = normalizeCategory(item.category ?? 'plats')
    ;(acc[c] = acc[c] ?? []).push(item)
    return acc
  }, {})

  // Categories to display: canonical order first, then unknown extras — skip empty when live
  const displayCategories = hasLive
    ? [...new Set([...CATEGORY_KEYS, ...Object.keys(byCategory)])].filter(c => (byCategory[c] ?? []).length > 0)
    : DEMO_ITEMS.map(c => c.category)

  const okCount  = convexItems.filter(i => i.isAvailable !== false).length
  const outCount = convexItems.filter(i => i.isAvailable === false).length
  const demoTotal = DEMO_ITEMS.reduce((s, c) => s + c.items.length, 0)

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'Tous',        count: hasLive ? convexItems.length : demoTotal },
    { key: 'ok',  label: 'Disponibles', count: okCount },
    { key: 'out', label: 'En rupture',  count: outCount },
  ]

  /* ── Modal helpers ── */

  function openAddModal(category?: string) {
    const cat = normalizeCategory(category ?? 'entrees')
    setModalMode('add'); setEditTarget(null)
    setFormName(''); setFormCategory(cat)
    setFormPrice(''); setFormDesc(''); setFormAvail(true); setFormTags(new Set())
    setFormEmoji(suggestEmoji('', cat)); setEmojiTouched(false); setEmojiOpen(false)
  }

  function openEditModal(item: ConvexItem) {
    const cat = normalizeCategory(item.category ?? 'plats')
    setModalMode('edit'); setEditTarget(item)
    setFormName(item.name)
    setFormCategory(cat)
    setFormPrice(item.priceCents > 0 ? (item.priceCents / 100).toFixed(2).replace('.', ',') : '')
    setFormDesc(item.description ?? '')
    setFormAvail(item.isAvailable !== false)
    setFormTags(new Set(item.tags ?? []))
    // Édition : on part de l'emoji existant et on ne l'écrase pas au fil de la frappe.
    setFormEmoji(item.emoji || suggestEmoji(item.name, cat)); setEmojiTouched(true); setEmojiOpen(false)
  }

  // En création, recalcule la suggestion tant que le gérant n'a pas choisi à la main.
  function onNameChange(value: string) {
    setFormName(value)
    if (modalMode === 'add' && !emojiTouched) setFormEmoji(suggestEmoji(value, formCategory))
  }
  function onCategoryChange(value: string) {
    setFormCategory(value)
    if (modalMode === 'add' && !emojiTouched) setFormEmoji(suggestEmoji(formName, value))
  }
  function pickEmoji(e: string) {
    setFormEmoji(e); setEmojiTouched(true); setEmojiOpen(false)
  }

  function toggleTag(id: string) {
    setFormTags(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  /* ── CRUD handlers ── */

  async function handleSubmit() {
    if (!restaurantId || !formName.trim()) return
    const normCat    = normalizeCategory(formCategory)
    const priceCents = Math.round(parseFloat(formPrice.replace(',', '.') || '0') * 100)
    const tags       = formTags.size > 0 ? [...formTags] : undefined
    const desc       = formDesc.trim() || undefined
    setFormLoading(true)
    try {
      const emoji = formEmoji || CATEGORY_EMOJI[normCat] || '🍽'
      if (modalMode === 'edit' && editTarget) {
        await updateItem({
          id: editTarget._id, name: formName.trim(), category: normCat,
          priceCents, emoji, description: desc, isAvailable: formAvail, tags,
        })
      } else {
        await addItemMut({
          restaurantId, name: formName.trim(), category: normCat,
          priceCents, emoji, description: desc, isAvailable: formAvail, tags,
        })
      }
      setModalMode(null)
    } finally { setFormLoading(false) }
  }

  async function handleDuplicate(item: ConvexItem) {
    if (!restaurantId) return
    const normCat = normalizeCategory(item.category)
    await addItemMut({
      restaurantId, name: `${item.name} (copie)`,
      category: normCat, priceCents: item.priceCents, emoji: item.emoji,
      description: item.description, isAvailable: item.isAvailable !== false,
      tags: item.tags && item.tags.length > 0 ? item.tags : undefined,
    }).catch(err => console.error('[MenuPage] duplicate failed:', err))
  }

  async function handleToggle(item: ConvexItem) {
    await updateItem({ id: item._id, isAvailable: !(item.isAvailable !== false) })
      .catch(err => console.error('[MenuPage] toggle failed:', err))
  }

  async function handleToggleSpecial(item: ConvexItem) {
    await toggleSpecialMut({ itemId: item._id, value: !item.isDailySpecial })
      .catch(err => console.error('[MenuPage] toggleDailySpecial failed:', err))
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteItem({ id: deleteTarget._id })
      setDeleteTarget(null)
    } catch (err) {
      console.error('[MenuPage] deleteItem failed:', err)
    } finally { setDeleteLoading(false) }
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !restaurantId) return
    let text: string
    try { text = await file.text() } catch { toast.error('Impossible de lire le fichier'); return }

    const { headers, rows } = parseCsv(text)
    if (headers.length === 0 || rows.length === 0) {
      toast.error('CSV vide ou format non reconnu (1ère ligne = en-têtes)')
      return
    }

    // Resolve which column supplies each field (header alias → content scoring)
    const map = resolveColumns(headers, rows)
    console.log('[CSV] séparateur + colonnes résolues :',
      Object.fromEntries((Object.keys(map) as (keyof ColMap)[]).map(k => [k, map[k] >= 0 ? headers[map[k]] : '—'])))

    if (map.name === -1) { toast.error('Colonne « nom » introuvable dans le fichier'); return }

    const at = (row: string[], idx: number) => idx >= 0 ? (row[idx] ?? '').trim() : ''

    setCsvLoading(true)
    let imported = 0
    const skipped: string[] = []
    let firstError: string | null = null

    for (const row of rows) {
      const name = at(row, map.name)
      if (!name) { skipped.push('(ligne sans nom)'); continue }

      // Prix — entier ou décimal accepté ; rejet seulement si vraiment illisible
      const priceVal = map.prix >= 0 ? parsePrice(at(row, map.prix)) : 0
      if (priceVal === null) { skipped.push(`${name} (prix illisible)`); continue }
      const priceCents = Math.round(priceVal * 100)

      const category = normalizeCategory(at(row, map.categorie) || 'plats')
      const emoji    = at(row, map.emoji) || CATEGORY_EMOJI[category] || '🍽'

      // Disponibilité — absente ou vide ⇒ disponible par défaut
      const dispoRaw    = at(row, map.dispo)
      const isAvailable = map.dispo === -1 || dispoRaw === '' ? true : isYes(dispoRaw)

      // Tags — colonne tags (séparée par ; , |) + badges booléens, tout normalisé
      const tagSet = new Set<string>()
      if (map.tags >= 0)
        at(row, map.tags).split(/[;,|]/).map(s => s.trim()).filter(Boolean).forEach(t => tagSet.add(normalizeTag(t)))
      if (map.bSignature >= 0 && isYes(at(row, map.bSignature))) tagSet.add('signature')
      if (map.bVeg >= 0 && isYes(at(row, map.bVeg))) tagSet.add('vg')
      if (map.bSaison >= 0 && isYes(at(row, map.bSaison))) tagSet.add('saison')
      const tags = tagSet.size > 0 ? [...tagSet] : undefined

      const allergenes  = at(row, map.allergenes) || undefined
      const description = at(row, map.description) || undefined

      try {
        await addItemMut({ restaurantId, name, priceCents, category, emoji, isAvailable, tags, allergenes, description })
        imported++
      } catch (err: unknown) {
        if (!firstError) firstError = err instanceof Error ? err.message : String(err)
        console.error(`[CSV] addItem échec — « ${name} » :`, err)
        skipped.push(name)
      }
    }

    setCsvLoading(false)
    if (fileRef.current) fileRef.current.value = ''

    if (imported > 0) {
      toast.success(`${imported} article${imported > 1 ? 's' : ''} importé${imported > 1 ? 's' : ''} avec succès`)
      if (skipped.length > 0) {
        console.warn(`[CSV] ${skipped.length} ligne(s) ignorée(s) :`, skipped)
        toast.warning(`${skipped.length} ligne${skipped.length > 1 ? 's ignorées' : ' ignorée'}`)
      }
    } else if (firstError) {
      // 0 import + erreur serveur → on remonte la vraie erreur Convex, pas un message trompeur
      console.error(`[CSV] échec total — ${skipped.length} ligne(s), 1ʳᵉ erreur :`, firstError)
      toast.error(`Échec de l'import : ${firstError.slice(0, 180)}`)
    } else if (skipped.length > 0) {
      toast.error(`Aucun article importé — ${skipped.length} ligne(s) sans nom ou prix valide`)
    } else {
      toast.info('Aucun article à importer')
    }
  }

  /* ── Render ── */

  return (
    <RestaurantLayout>
      <PageHeader
        title="Menu / Carte"
        subtitle={
          <span>
            {hasLive ? convexItems.length : demoTotal} articles
            {' · '}
            {hasLive ? displayCategories.filter(c => (byCategory[c] ?? []).length > 0).length : DEMO_ITEMS.length} catégories
          </span>
        }
        actions={
          <>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={csvLoading}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg border text-[13px] font-medium disabled:opacity-50"
              style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', boxShadow: 'var(--ds-shadow-sm)' }}
            >
              <Download size={14} />
              {csvLoading ? 'Import…' : 'Importer CSV'}
            </button>
            <button
              onClick={() => window.print()}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg border text-[13px] font-medium"
              style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', boxShadow: 'var(--ds-shadow-sm)' }}
            >
              <Printer size={14} />
              Imprimer rapport
            </button>
            <button
              onClick={() => openAddModal()}
              className="inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg text-[13px] font-semibold text-white"
              style={{ background: '#E8920A' }}
            >
              <Plus size={14} />
              Nouvel article
            </button>
          </>
        }
      />

      <div className="px-9 py-6 space-y-5">

        {/* Message affiché aux clients (écran de paiement QR) */}
        <div
          className="rounded-[12px] border px-5 py-4"
          style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
        >
          <label className="block text-[12px] font-semibold ds-text-secondary mb-1.5">
            Message affiché aux clients
          </label>
          <input
            key={restaurant?._id ?? 'no-resto'}
            defaultValue={restaurant?.specialMessage ?? ''}
            onBlur={e => saveSpecialMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            placeholder="Ex: Bonne soirée ! Profitez de -20% sur les desserts ce soir 🎉"
            maxLength={120}
            disabled={!restaurantId}
            className="w-full rounded-lg border px-3 py-2 outline-none disabled:opacity-50"
            style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }}
          />
          <p className="text-[11px] ds-text-tertiary mt-1">Affiché sur l'écran de paiement QR client</p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-2 h-8 px-2.5 rounded-lg border"
            style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)', width: '280px' }}
          >
            <Search size={13} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un plat, ingrédient…"
              className="flex-1 bg-transparent border-none outline-none min-w-0"
              style={{ fontSize: '13px', color: 'var(--ds-text-primary)' }}
            />
          </div>
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
        </div>

        {/* Stats strip */}
        <div
          className="grid grid-cols-2 xl:grid-cols-4 border rounded-[12px] overflow-hidden"
          style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
        >
          {[
            { icon: Clock,       label: 'Articles disponibles',   value: String(hasLive ? okCount : demoTotal),           sub: hasLive ? `${convexItems.length} au total` : 'données démo', accent: false },
            { icon: BarChart3,   label: 'CA généré par la carte', value: ca28 > 0 ? `${ca28.toFixed(2).replace('.', ',')}€` : '0€', sub: '28 derniers jours', accent: true },
            { icon: AlertCircle, label: 'Articles en rupture',    value: String(outCount),                       sub: outCount > 0 ? `${outCount} non dispo.` : 'Tous disponibles', error: outCount > 0 },
            { icon: Check,       label: 'Catégories actives',     value: String(hasLive ? displayCategories.filter(c => byCategory[c]?.length).length : DEMO_ITEMS.length), sub: 'dans la carte' },
          ].map((cell, i) => (
            <div key={i} className="flex flex-col gap-1 px-5 py-4" style={{ borderRight: i < 3 ? '1px solid var(--ds-border)' : 'none' }}>
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">
                <cell.icon size={11} style={{ color: 'var(--ds-text-tertiary)' }} />
                {cell.label}
              </div>
              <div
                className="font-bold text-[16px] leading-none tabular-nums tracking-[-0.02em] mt-1"
                style={{ fontFamily: 'Inter, sans-serif', color: cell.accent ? 'var(--ds-accent)' : (cell as any).error ? 'var(--ds-error)' : 'var(--ds-text-primary)' }}
              >
                {cell.value}
              </div>
              <div className="text-[11.5px] ds-text-tertiary">{cell.sub}</div>
            </div>
          ))}
        </div>

        {/* Demo banner */}
        {!hasLive && (
          <div
            className="flex items-center gap-3 px-5 py-3 rounded-[10px] border"
            style={{ background: 'var(--ds-accent-soft)', borderColor: '#F5DDB3' }}
          >
            <span className="text-[13px]" style={{ color: 'var(--ds-accent-strong)' }}>
              <strong>Mode démo</strong> — Synchronisez votre caisse Square ou importez un CSV pour activer les modifications en direct.
            </span>
          </div>
        )}

        {/* Categories */}
        {hasLive ? (
          displayCategories.map(catName => {
            const items = (byCategory[catName] ?? []).filter(item =>
              !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
              (item.description ?? '').toLowerCase().includes(search.toLowerCase())
            )
            if (items.length === 0) return null
            return (
              <LiveCategorySection
                key={catName}
                categoryName={catName}
                items={items}
                filter={filter}
                onAdd={() => openAddModal(catName)}
                onEdit={openEditModal}
                onDuplicate={handleDuplicate}
                onDeleteRequest={setDeleteTarget}
                onToggle={handleToggle}
                onToggleSpecial={handleToggleSpecial}
              />
            )
          })
        ) : (
          DEMO_ITEMS.map(cat => (
            <DemoCategorySection
              key={cat.category}
              cat={cat}
              onAdd={() => openAddModal(cat.category)}
            />
          ))
        )}

      </div>

      {/* ── Add / Edit modal ── */}
      <AnimatePresence>
        {modalMode !== null && (
          <m.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setModalMode(null) }}
          >
            <m.div
              className="rounded-2xl overflow-hidden w-[480px] max-w-full max-h-[90vh] flex flex-col"
              style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}
              initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
                <span className="font-bold text-[15px] ds-text-primary">
                  {modalMode === 'edit' ? `Modifier — ${editTarget?.name}` : 'Nouvel article'}
                </span>
                <button onClick={() => setModalMode(null)} className="ds-text-tertiary hover:ds-text-primary">
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                {/* Emoji + Nom */}
                <div>
                  <label className="block text-[11.5px] font-semibold ds-text-secondary mb-1.5 uppercase tracking-[0.06em]">Nom du plat *</label>
                  <div className="flex gap-2">
                    <button
                      ref={emojiBtnRef}
                      type="button"
                      onClick={() => setEmojiOpen(o => !o)}
                      title="Choisir un emoji"
                      className="shrink-0 rounded-lg border flex items-center justify-center transition-colors"
                      style={{
                        width: 44, height: 38, fontSize: 22, lineHeight: 1,
                        background: 'var(--ds-bg-base)',
                        borderColor: emojiOpen ? '#E8920A' : 'var(--ds-border)',
                      }}
                    >
                      {formEmoji}
                    </button>
                    <input
                      value={formName} onChange={e => onNameChange(e.target.value)}
                      placeholder="ex: Pad thaï crevettes"
                      className="flex-1 rounded-lg border px-3 py-2 outline-none"
                      style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }}
                      autoFocus
                    />
                  </div>
                  <div className="text-[11px] ds-text-tertiary mt-1">
                    Emoji {emojiTouched ? 'choisi manuellement' : 'suggéré automatiquement'} — cliquez dessus pour changer.
                  </div>
                  {emojiOpen && (
                    <EmojiPicker
                      anchorRef={emojiBtnRef}
                      value={formEmoji}
                      onSelect={pickEmoji}
                      onClose={() => setEmojiOpen(false)}
                    />
                  )}
                </div>

                {/* Catégorie */}
                <div>
                  <label className="block text-[11.5px] font-semibold ds-text-secondary mb-1.5 uppercase tracking-[0.06em]">Catégorie</label>
                  <select
                    value={formCategory} onChange={e => onCategoryChange(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 outline-none"
                    style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }}
                  >
                    {CATEGORY_KEYS.map(k => (
                      <option key={k} value={k}>{displayCategory(k)}</option>
                    ))}
                  </select>
                </div>

                {/* Prix + Description */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11.5px] font-semibold ds-text-secondary mb-1.5 uppercase tracking-[0.06em]">Prix (€)</label>
                    <input
                      type="text" inputMode="decimal" value={formPrice} onChange={e => setFormPrice(e.target.value)}
                      placeholder="ex: 13,90"
                      className="w-full rounded-lg border px-3 py-2 outline-none"
                      style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-semibold ds-text-secondary mb-1.5 uppercase tracking-[0.06em]">Description courte</label>
                    <input
                      value={formDesc} onChange={e => setFormDesc(e.target.value)}
                      placeholder="Ingrédients, préparation…"
                      className="w-full rounded-lg border px-3 py-2 outline-none"
                      style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }}
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-[11.5px] font-semibold ds-text-secondary mb-2 uppercase tracking-[0.06em]">Tags</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TAG_OPTIONS.map(tag => {
                      const selected = formTags.has(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-[12.5px] font-medium text-left transition-colors"
                          style={{
                            background: selected ? tag.bg : 'var(--ds-bg-base)',
                            borderColor: selected ? tag.color : 'var(--ds-border)',
                            color: selected ? tag.color : 'var(--ds-text-secondary)',
                          }}
                        >
                          <span
                            className="w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0"
                            style={{ background: selected ? tag.color : 'transparent', borderColor: selected ? tag.color : 'var(--ds-border-strong)' }}
                          >
                            {selected && <Check size={10} color="white" />}
                          </span>
                          {tag.label}
                        </button>
                      )
                    })}
                  </div>
                  {/* Allergènes text */}
                  <input
                    placeholder="⚠️ Allergènes (texte libre : gluten, lactose…)"
                    className="w-full mt-2 rounded-lg border px-3 py-2 outline-none"
                    style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }}
                  />
                </div>

                {/* Disponibilité */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <div className="text-[13px] font-semibold ds-text-primary">Disponible à la carte</div>
                    <div className="text-[12px] ds-text-tertiary mt-0.5">Visible et commandable par les clients</div>
                  </div>
                  <Toggle on={formAvail} onChange={() => setFormAvail(v => !v)} />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2 px-5 pb-5 pt-3 border-t flex-shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
                <button
                  onClick={() => setModalMode(null)}
                  className="flex-1 rounded-xl border text-sm font-semibold py-2.5"
                  style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={formLoading || !formName.trim() || !restaurantId}
                  className="flex-1 rounded-xl text-white text-sm font-semibold py-2.5 disabled:opacity-50"
                  style={{ background: '#E8920A' }}
                >
                  {formLoading ? (modalMode === 'edit' ? 'Mise à jour…' : 'Ajout…') : (modalMode === 'edit' ? 'Enregistrer' : "Ajouter l'article")}
                </button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <m.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget && !deleteLoading) setDeleteTarget(null) }}
          >
            <m.div
              className="rounded-2xl overflow-hidden w-[380px] max-w-full"
              style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}
              initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
                <span className="font-bold text-[15px]" style={{ color: 'var(--ds-error)' }}>Supprimer cet article ?</span>
                <button onClick={() => setDeleteTarget(null)} className="ds-text-tertiary hover:ds-text-primary"><X size={16} /></button>
              </div>
              <div className="px-5 py-5">
                <p className="text-[13.5px] ds-text-secondary leading-[1.55]">
                  <strong className="ds-text-primary">{deleteTarget.name}</strong> sera définitivement supprimé de votre carte. Cette action est irréversible.
                </p>
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteLoading}
                  className="flex-1 rounded-xl border text-sm font-semibold py-2.5"
                  style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 rounded-xl text-white text-sm font-semibold py-2.5 disabled:opacity-50"
                  style={{ background: 'var(--ds-error)' }}
                >
                  {deleteLoading ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

    </RestaurantLayout>
  )
}
