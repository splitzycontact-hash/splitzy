const NAME_RULES: [RegExp, string][] = [
  [/huître|moule|coquille/i, '🦪'],
  [/gambas|crevette|homard|langoustine|crustacé/i, '🦐'],
  [/foie\s*gras/i, '🫙'],
  [/canard|magret/i, '🦆'],
  [/saumon/i, '🐟'],
  [/cabillaud|dorade|bar |sole|turbot|poisson|lieu|merlu/i, '🐟'],
  [/tartare\s*(de\s*bœuf|de\s*viande|de\s*boeuf)/i, '🥩'],
  [/carpaccio/i, '🥩'],
  [/entrecôte|côte\s*de\s*bœuf|côte\s*de\s*boeuf|steak|faux[\s-]filet/i, '🥩'],
  [/bœuf|boeuf|viande\s*rouge/i, '🥩'],
  [/poulet|volaille|suprême|pintade|caille/i, '🍗'],
  [/porc|cochon|chorizo|jambon|andouillette|boudin/i, '🥓'],
  [/agneau|carré\s*d'agneau|gigot/i, '🍖'],
  [/veau/i, '🥩'],
  [/tartare\s*(de\s*)?saumon|tartare\s*(de\s*)?thon/i, '🐟'],
  [/tartare/i, '🥩'],
  [/salade/i, '🥗'],
  [/soupe|velouté|bisque|gaspacho|potage/i, '🍲'],
  [/asperge/i, '🌿'],
  [/champignon|truffe/i, '🍄'],
  [/fromage|camembert|brie|comté|roquefort|chèvre|plateau/i, '🧀'],
  [/bruschetta|toast|tartine/i, '🍞'],
  [/pâtes|tagliatelle|spaghetti|linguine|rigatoni|ravioli|gnocchi|lasagne/i, '🍝'],
  [/risotto/i, '🍚'],
  [/pizza/i, '🍕'],
  [/burger/i, '🍔'],
  [/sandwich|wrap|croque/i, '🥪'],
  [/tarte\s*tatin|tarte\s*(au\s*(citron|pomme)|aux\s*(pomme|fruit))/i, '🥧'],
  [/crème\s*brûlée|crème\s*caramel|panna\s*cotta|flan/i, '🍮'],
  [/fondant|mi[\s-]cuit|coulant/i, '🍫'],
  [/chocolat/i, '🍫'],
  [/glace|sorbet|parfait\s*glacé/i, '🍦'],
  [/tiramisu|mousse/i, '🍰'],
  [/pavlova|meringue/i, '🍰'],
  [/mille.feuille|éclair|profiterole|macaron|paris.brest/i, '🍰'],
  [/tarte(?!are)/i, '🥧'],
  [/fraise/i, '🍓'],
  [/framboise|mûre|myrtille|fruits\s*rouges/i, '🫐'],
  [/ananas/i, '🍍'],
  [/mangue/i, '🥭'],
  [/champagne|mousseux|prosecco|crémant|bulles/i, '🍾'],
  [/bordeaux|bourgogne|côtes\s*du|côte\s*du|vin\s*(rouge|blanc|rosé)|verre\s*de\s*vin|carafe/i, '🍷'],
  [/bière|lager|ipa|blonde|brune|pression/i, '🍺'],
  [/eau\s*(plate|pétillante|minérale)|san\s*pellegrino|evian|perrier/i, '💧'],
  [/jus\s*(d'orange|de\s*(pomme|fruit|tomate))|smoothie|nectar/i, '🥤'],
  [/limonade|orangina|coca|soda|schweppes/i, '🥤'],
  [/café|expresso|cappuccino|latte|americano|ristretto|noisette/i, '☕'],
  [/thé|infusion|tisane|matcha/i, '🍵'],
  [/cocktail|mojito|spritz|cosmopolitan|daiquiri|margarita/i, '🍹'],
  [/soufflé/i, '🍮'],
]

const CATEGORY_EMOJI: Record<string, string> = {
  entrees: '🥗',
  plats: '🍽',
  desserts: '🍮',
  boissons: '🥤',
  vins: '🍷',
  cocktails: '🍹',
  bieres: '🍺',
  cafes: '☕',
  fromages: '🧀',
  snacks: '🍟',
}

export function assignEmoji(name: string, category: string): string {
  for (const [pattern, emoji] of NAME_RULES) {
    if (pattern.test(name)) return emoji
  }
  const normCat = category
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '')
  return CATEGORY_EMOJI[normCat] ?? CATEGORY_EMOJI[normalizeCategoryId(category)] ?? '🍽'
}

export function normalizeCategoryId(cat: string): 'entrees' | 'plats' | 'desserts' | 'boissons' {
  const c = cat.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (/entree|starter|appetizer|amuse|hors/.test(c)) return 'entrees'
  if (/dessert|sweet|sucre|patisserie/.test(c)) return 'desserts'
  if (/boisson|drink|beverage|vin|biere|cocktail|cafe|the|eau|jus/.test(c)) return 'boissons'
  return 'plats'
}
