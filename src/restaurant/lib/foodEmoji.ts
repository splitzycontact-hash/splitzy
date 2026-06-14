// Emoji intelligent pour les articles du menu.
// - suggestEmoji(name, categoryKey) : auto-suggestion via dictionnaire de mots-clés FR
//   (insensible casse/accents, recherche dans les mots, repli par catégorie)
// - EMOJI_SECTIONS : grille d'emojis alimentaires pour le sélecteur manuel

/** Minuscule, sans accents, œ→oe / æ→ae. */
function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Un mot-clé court (≤3) doit matcher sur une frontière de mot (évite « vin »→vinaigre,
// « bar »→barbe…). Un mot-clé plus long matche en sous-chaîne (« dans les mots »).
function matchKeyword(normName: string, kw: string): boolean {
  const k = norm(kw)
  if (!k) return false
  if (k.length <= 3) {
    return new RegExp(`(?:^|[^a-z0-9])${escapeRe(k)}(?:[^a-z0-9]|$)`).test(normName)
  }
  return normName.includes(k)
}

// Repli par catégorie canonique (cf. MenuPage normalizeCategory).
const CATEGORY_FALLBACK: Record<string, string> = {
  entrees: '🥗',
  plats: '🍽️',
  desserts: '🍰',
  boissons: '🥤',
}

// Ordre = priorité : les entrées en tête gagnent en cas de conflit
// (ex. « fondant chocolat » → 🍫 avant 🎂 ; « pomme de terre » → 🥔 avant 🍎 ;
//  « soupe asiatique » → 🍜 avant 🍲).
const DICT: [string, string[]][] = [
  // ── Conflits prioritaires ──
  ['🍫', ['brownie', 'chocolat', 'choco', 'nutella', 'praline']],

  // ── Spécialités (avant soupes / pâtes / fruits) ──
  ['🍜', ['ramen', 'pho', 'soupe asiatique', 'udon', 'laksa', 'nouilles sautees']],
  ['🍱', ['sushi', 'maki', 'sashimi', 'bento', 'chirashi', 'california']],
  ['🥟', ['dim sum', 'dumpling', 'gyoza', 'bao', 'wonton', 'raviole asiatique']],
  ['🥢', ['nem', 'nems', 'rouleau de printemps', 'spring roll', 'samosa', 'samossa']],
  ['🌮', ['tacos', 'taco', 'burrito', 'quesadilla', 'fajita', 'enchilada', 'nachos']],
  ['🍛', ['curry', 'colombo', 'massala', 'masala', 'tikka', 'dahl', 'butter chicken']],

  // ── Viandes ──
  ['🥩', ['boeuf', 'entrecote', 'steak', 'cote de boeuf', 'bavette', 'faux-filet', 'rumsteck', 'tartare', 'onglet', 'pave de boeuf']],
  ['🍗', ['poulet', 'volaille', 'supreme', 'dinde', 'cuisse', 'aile', 'nuggets']],
  ['🥓', ['porc', 'cochon', 'jambon', 'lard', 'bacon', 'echine', 'travers']],
  ['🦆', ['canard', 'magret', 'foie gras', 'confit']],
  ['🐇', ['lapin', 'lievre']],
  ['🍖', ['agneau', 'veau', 'viande', 'grillade', 'brochette', 'gigot', 'cotelette', 'mouton', 'souris']],

  // ── Poissons & fruits de mer ──
  ['🦐', ['crevette', 'gambas', 'langoustine', 'scampi']],
  ['🦞', ['homard', 'langouste']],
  ['🦪', ['huitre', 'moule', 'coquille', 'saint-jacques', 'saint jacques']],
  ['🦑', ['calamar', 'calamars', 'poulpe', 'encornet', 'seiche']],
  ['🐚', ['fruits de mer', 'coquillage', 'bulot', 'palourde']],
  ['🐟', ['saumon', 'thon', 'cabillaud', 'daurade', 'dorade', 'poisson', 'merlu', 'sole', 'truite', 'sardine', 'maquereau', 'bar', 'colin', 'lotte', 'anguille']],

  // ── Pizzas, burgers, pains ──
  ['🍕', ['pizza', 'calzone', 'margherita']],
  ['🍔', ['burger', 'hamburger', 'cheeseburger']],
  ['🥪', ['sandwich', 'croque', 'panini', 'club', 'bagel']],
  ['🫓', ['tartine', 'bruschetta', 'naan', 'pita', 'focaccia', 'galette', 'wrap']],
  ['🥖', ['baguette']],
  ['🍞', ['pain', 'brioche', 'bread', 'toast']],

  // ── Œufs ──
  ['🍳', ['oeuf', 'omelette', 'quiche', 'brouilles', 'frittata', 'benedicte']],

  // ── Fromages ──
  ['🧀', ['fromage', 'raclette', 'fondue', 'camembert', 'brie', 'chevre', 'comte', 'reblochon', 'mozzarella', 'burrata', 'gruyere', 'roquefort', 'parmesan', 'feta']],

  // ── Soupes & potages ──
  ['🍲', ['soupe', 'veloute', 'potage', 'bisque', 'gaspacho', 'minestrone', 'tajine', 'tagine', 'pot-au-feu']],
  ['🥣', ['bouillon', 'consomme', 'porridge']],

  // ── Pâtes & riz ──
  ['🍝', ['pates', 'pate', 'spaghetti', 'tagliatelle', 'linguine', 'penne', 'ravioli', 'lasagne', 'lasagnes', 'gnocchi', 'risotto', 'macaroni', 'carbonara', 'bolognaise', 'bolognese', 'nouilles']],
  ['🍚', ['riz', 'pilaf', 'cantonais']],

  // ── Salades & légumes ──
  ['🥗', ['salade', 'roquette', 'mache', 'crudite', 'cesar', 'caesar', 'nicoise', 'coleslaw']],
  ['🍅', ['tomate', 'caprese']],
  ['🥑', ['avocat', 'guacamole']],
  ['🍄', ['champignon', 'truffe', 'cepe', 'girolle', 'morille']],
  ['🥕', ['carotte']],
  ['🥒', ['courgette', 'concombre', 'cornichon']],
  ['🌿', ['epinard', 'epinards', 'herbe', 'basilic', 'persil', 'aromate']],
  // Patate après poissons (« moules frites » → 🦪) mais avant 🍎 (« pomme de terre » ≠ pomme).
  ['🥔', ['pomme de terre', 'pommes de terre', 'puree', 'frite', 'frites', 'gratin dauphinois', 'tartiflette']],

  // ── Desserts (tartes/glaces avant fruits simples) ──
  ['🥧', ['tarte', 'tartelette', 'tatin', 'flan', 'clafoutis']],
  ['🍨', ['glace', 'sorbet', 'gelato', 'vacherin']],
  ['🥞', ['crepe', 'pancake', 'gaufre', 'waffle']],
  ['🍪', ['macaron', 'cookie', 'biscuit', 'sable', 'financier', 'madeleine', 'speculoos']],
  ['🍮', ['mousse', 'tiramisu', 'panna cotta', 'creme', 'pudding', 'caramel', 'ile flottante', 'dessert']],
  ['🎂', ['gateau', 'cake', 'fondant', 'entremets', 'buche']],
  ['🍓', ['fraise', 'framboise', 'fruits rouges', 'myrtille', 'mure', 'fruit']],
  ['🍎', ['pomme']],
  ['🍐', ['poire']],
  ['🍋', ['citron', 'lemon', 'agrume', 'yuzu']],
  ['🍍', ['ananas']],
  ['🥭', ['mangue']],
  ['🍌', ['banane']],

  // ── Boissons ──
  ['☕', ['cafe', 'expresso', 'espresso', 'cappuccino', 'latte', 'mocha', 'americano', 'ristretto', 'macchiato']],
  ['🍵', ['the', 'infusion', 'matcha', 'tisane', 'chai']],
  ['🧃', ['jus', 'nectar']],
  ['🥤', ['limonade', 'soda', 'cola', 'coca', 'sprite', 'fanta', 'ice tea', 'milkshake', 'smoothie', 'frappe', 'perrier']],
  ['💧', ['eau', 'water']],
  ['🍷', ['vin', 'wine', 'bordeaux', 'bourgogne']],
  ['🍺', ['biere', 'beer', 'ipa', 'pinte', 'lager', 'pils']],
  ['🍹', ['cocktail', 'mojito', 'margarita', 'spritz', 'punch', 'sangria', 'daiquiri', 'caipirinha']],
  ['🥂', ['champagne', 'prosecco', 'cremant', 'mousseux']],
  ['🥃', ['whisky', 'whiskey', 'rhum', 'vodka', 'gin', 'cognac', 'bourbon', 'tequila', 'digestif', 'armagnac']],
]

/**
 * Emoji suggéré pour un nom d'article. Repli sur l'emoji de catégorie, puis ✨.
 * @param categoryKey clé canonique (entrees|plats|desserts|boissons), optionnelle.
 */
export function suggestEmoji(name: string, categoryKey?: string): string {
  const n = norm(name)
  if (n) {
    for (const [emoji, kws] of DICT) {
      for (const kw of kws) {
        if (matchKeyword(n, kw)) return emoji
      }
    }
  }
  return CATEGORY_FALLBACK[norm(categoryKey ?? '')] ?? '✨'
}

export interface EmojiSection {
  label: string
  icon: string
  emojis: string[]
}

// Grille du sélecteur manuel (8 sections, comptes conformes au brief).
export const EMOJI_SECTIONS: EmojiSection[] = [
  { label: 'Viandes',           icon: '🥩', emojis: ['🥩', '🍖', '🍗', '🥓', '🦆', '🐇', '🌭', '🍔', '🥙', '🫔', '🍢', '🧆'] },
  { label: 'Poissons & mer',    icon: '🐟', emojis: ['🐟', '🐠', '🍣', '🍤', '🦐', '🦞', '🦀', '🦪', '🦑', '🐚'] },
  { label: 'Légumes & salades', icon: '🥗', emojis: ['🥗', '🥬', '🍅', '🥑', '🥒', '🥕', '🌽', '🍄', '🌿', '🧅', '🧄', '🫑'] },
  { label: 'Féculents & pâtes', icon: '🍝', emojis: ['🍝', '🍜', '🍚', '🍛', '🥔', '🍟', '🫓', '🥖'] },
  { label: 'Œufs & fromages',   icon: '🍳', emojis: ['🍳', '🧀', '🥚', '🧈', '🥛', '🫕'] },
  { label: 'Desserts & sucrés', icon: '🍰', emojis: ['🍰', '🎂', '🥧', '🍮', '🍨', '🍦', '🍧', '🥞', '🧇', '🍪', '🍫', '🍩', '🍓', '🍎'] },
  { label: 'Boissons',          icon: '☕', emojis: ['☕', '🍵', '🧃', '💧', '🥤', '🍷', '🍺', '🍹', '🥂', '🥃'] },
  { label: 'Divers',            icon: '🍽️', emojis: ['🍽️', '🍴', '🍱', '⭐', '🔥', '👑', '❤️', '✨'] },
]
