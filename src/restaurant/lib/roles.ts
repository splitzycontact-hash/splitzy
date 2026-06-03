// Contrôle d'accès par rôle (RBAC) du dashboard restaurant.
//
// `members.role` ∈ {owner, manager, staff} (cf convex/schema.ts + invitations.accept :
// une invitation « viewer » crée une ligne members avec role 'staff'). Côté UI on
// expose un rôle applicatif {owner, manager, viewer}. Les restrictions sont UI-only —
// les mutations Convex sensibles ont déjà leurs propres guards backend.

export type RestaurantRole = 'owner' | 'manager' | 'viewer'

// members.role (owner|manager|staff) → rôle applicatif. Tout rôle inconnu ou
// 'staff' (invitation viewer) retombe sur 'viewer' (moindre privilège).
export function memberRoleToAppRole(role?: string | null): RestaurantRole {
  if (role === 'owner') return 'owner'
  if (role === 'manager') return 'manager'
  return 'viewer'
}

// Libellé du badge de rôle (pas affiché pour owner).
export const ROLE_LABEL: Record<Exclude<RestaurantRole, 'owner'>, string> = {
  manager: 'Manager',
  viewer: 'Viewer',
}
