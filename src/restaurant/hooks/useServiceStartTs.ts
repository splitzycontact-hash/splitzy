import { useMemo } from 'react'

// M6-A : timestamp du début de service (minuit local du jour courant).
// Passé en `sinceTs` aux queries chat pour masquer les messages des services
// précédents. Stable pour le rendu (useMemo) — recalculé seulement au remount.
export function useServiceStartTs() {
  return useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])
}
