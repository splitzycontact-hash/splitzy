export function formatEur(cents: number): string {
  const euros = cents / 100
  return euros % 1 === 0 ? `${euros}€` : `${euros.toFixed(2).replace('.', ',')}€`
}
