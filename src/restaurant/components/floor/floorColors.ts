export const SERVER_COLORS = [
  { bg: 'var(--ds-accent-soft)', border: 'var(--ds-accent)', text: 'var(--ds-accent-strong)' },
  { bg: 'rgba(59,130,246,0.20)', border: '#3B82F6', text: '#1D4ED8' },
  { bg: 'rgba(34,197,94,0.20)',  border: '#22C55E', text: '#15803D' },
  { bg: 'rgba(168,85,247,0.20)', border: '#A855F7', text: '#7E22CE' },
  { bg: 'rgba(244,63,94,0.20)',  border: '#F43F5E', text: '#BE123C' },
  { bg: 'rgba(16,185,129,0.20)', border: '#10B981', text: '#065F46' },
] as const
export const ZONE_PALETTE = SERVER_COLORS.map(c => c.border)
export const STATUS_COLORS = {
  free:    { bg: 'var(--ds-bg-subtle)',    border: 'var(--ds-border)',        text: 'var(--ds-text-tertiary)' },
  dining:  { bg: 'var(--ds-bg-surface)',   border: 'var(--ds-border-strong)', text: 'var(--ds-text-primary)'  },
  payment: { bg: 'var(--ds-accent-soft)',  border: 'var(--ds-accent)',        text: 'var(--ds-accent-strong)' },
  paid:    { bg: 'var(--ds-success-soft)', border: 'var(--ds-success)',       text: 'var(--ds-success-strong)'},
} as const
