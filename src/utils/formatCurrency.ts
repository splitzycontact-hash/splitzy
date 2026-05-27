export function formatEur(cents: number): string {
  const euros = cents / 100
  if (euros % 1 === 0) return `${euros}€`
  return euros.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€'
}
