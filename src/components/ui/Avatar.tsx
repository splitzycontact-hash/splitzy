
export const AVATARS = [
  { emoji: '🦊', color: '#E8920A', bg: '#FEF3C7' },
  { emoji: '🐻', color: '#3B82F6', bg: '#DBEAFE' },
  { emoji: '🐸', color: '#22C55E', bg: '#DCFCE7' },
  { emoji: '🐙', color: '#8B5CF6', bg: '#EDE9FE' },
  { emoji: '🦄', color: '#EC4899', bg: '#FCE7F3' },
  { emoji: '🐯', color: '#EF4444', bg: '#FEE2E2' },
]

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

const sizeMap: Record<AvatarSize, { wrapper: string; text: string }> = {
  sm: { wrapper: 'w-8 h-8', text: 'text-base' },
  md: { wrapper: 'w-11 h-11', text: 'text-xl' },
  lg: { wrapper: 'w-14 h-14', text: 'text-2xl' },
  xl: { wrapper: 'w-20 h-20', text: 'text-4xl' },
}

interface AvatarProps {
  index: number
  size?: AvatarSize
  ring?: boolean
  ringColor?: string
  className?: string
  onClick?: () => void
  selected?: boolean
}

export function Avatar({
  index,
  size = 'md',
  ring = false,
  ringColor,
  className = '',
  onClick,
  selected = false,
}: AvatarProps) {
  const avatar = AVATARS[index % AVATARS.length]
  const { wrapper, text } = sizeMap[size]

  const borderStyle = selected
    ? { border: `2.5px solid ${avatar.color}` }
    : ring && ringColor
    ? { border: `2.5px solid ${ringColor}` }
    : {}

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`
        ${wrapper} rounded-full flex items-center justify-center flex-shrink-0
        ${selected ? 'shadow-glow' : ''}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${className}
      `}
      style={{ background: avatar.bg, ...borderStyle }}
    >
      <span className={text} role="img" aria-label={`avatar-${index}`}>{avatar.emoji}</span>
    </button>
  )
}

export function DottedAvatar({ size = 'md', label = '+toi' }: { size?: AvatarSize; label?: string }) {
  const { wrapper, text } = sizeMap[size]
  return (
    <div
      className={`${wrapper} rounded-full flex items-center justify-center flex-shrink-0 border-2 border-dashed border-muted bg-transparent`}
    >
      <span className={`${text} text-muted font-semibold text-xs`}>{label}</span>
    </div>
  )
}
