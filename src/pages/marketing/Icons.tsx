interface IconProps {
  size?: number
  stroke?: number
  className?: string
  children?: React.ReactNode
}

interface IconBaseProps extends IconProps {
  d?: string
  fill?: string
  noStroke?: boolean
}

export const Icon = ({ d, size = 20, stroke = 1.8, fill = 'none', noStroke = false, children, className = '' }: IconBaseProps) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill={fill}
    stroke={noStroke ? 'none' : 'currentColor'}
    strokeWidth={noStroke ? undefined : stroke}
    strokeLinecap="round" strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {d ? <path d={d} /> : children}
  </svg>
)

export const IconArrowRight = (p: IconProps) => <Icon {...p} d="M5 12h14M13 5l7 7-7 7" />
export const IconPlay = (p: IconProps) => <Icon {...p} fill="currentColor" noStroke><path d="M8 5v14l11-7z" /></Icon>
export const IconMenu = (p: IconProps) => <Icon {...p} d="M4 6h16M4 12h16M4 18h16" />
export const IconClose = (p: IconProps) => <Icon {...p} d="M6 6l12 12M18 6L6 18" />
export const IconCheck = (p: IconProps) => <Icon {...p} d="M5 12.5l4.5 4.5L19 7" />
export const IconSparkles = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.7l-1.7-4.7L6 9.3l4.3-1.7L12 3z" />
    <path d="M19 14l.9 2.4L22 17.3l-2.1.9L19 20.6l-.9-2.4L16 17.3l2.1-.9L19 14z" />
  </Icon>
)
export const IconQr = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3"  y="3"  width="7" height="7" rx="1" />
    <rect x="14" y="3"  width="7" height="7" rx="1" />
    <rect x="3"  y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1" />
  </Icon>
)
export const IconMenuBook = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" />
    <path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z" />
  </Icon>
)
export const IconWallet = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H5a2 2 0 0 0-2-2z" />
    <path d="M3 9v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6H7a2 2 0 0 1-2-2 2 2 0 0 0-2 0z" />
    <circle cx="17" cy="14" r="1.2" fill="currentColor" stroke="none" />
  </Icon>
)
export const IconPhoneScan = (p: IconProps) => (
  <Icon {...p}>
    <rect x="6" y="2" width="12" height="20" rx="2.5" />
    <path d="M10 18h4" />
    <path d="M9 7h2M13 7h2M9 11h6" />
  </Icon>
)
export const IconTap = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 11V6a3 3 0 0 1 6 0v5" />
    <path d="M9 11l-2 2 6 8h6l1-7-4-2-1-2" />
  </Icon>
)
export const IconBolt = (p: IconProps) => <Icon {...p} d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" noStroke />
export const IconStar = (p: IconProps) => <Icon {...p} fill="currentColor" noStroke d="M12 2l2.9 6.5 7.1.7-5.3 4.8 1.5 7L12 17.5 5.8 21l1.5-7L2 9.2l7.1-.7L12 2z" />
export const IconPlus = (p: IconProps) => <Icon {...p} d="M12 5v14M5 12h14" />
export const IconMinus = (p: IconProps) => <Icon {...p} d="M5 12h14" />
export const IconBell = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10 21a2 2 0 0 0 4 0" />
  </Icon>
)
export const IconChartBar = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 3v18h18" />
    <rect x="7"  y="13" width="3" height="5" />
    <rect x="12" y="9"  width="3" height="9" />
    <rect x="17" y="5"  width="3" height="13" />
  </Icon>
)
export const IconCloud = (p: IconProps) => <Icon {...p} d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5 1.5A4 4 0 0 0 7 19h10.5z" />
export const IconUsers = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
)
export const IconShield = (p: IconProps) => <Icon {...p} d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
export const IconQuote = (p: IconProps) => (
  <Icon {...p} fill="currentColor" noStroke>
    <path d="M7 7h4v4H7zM7 11c0 3 1.5 5 4 6v2c-4-1-6.5-4-6.5-8V7H7v4z" />
    <path d="M15 7h4v4h-4zM15 11c0 3 1.5 5 4 6v2c-4-1-6.5-4-6.5-8V7H15v4z" />
  </Icon>
)
export const IconTwitter = (p: IconProps) => <Icon {...p} fill="currentColor" noStroke d="M18.9 5H21l-6.5 7.4L22 21h-6l-4.7-6.2L5.9 21H3.8l7-8L3 5h6l4.3 5.6L18.9 5z" />
export const IconLinkedin = (p: IconProps) => (
  <Icon {...p} fill="currentColor" noStroke>
    <rect x="2"  y="2" width="20" height="20" rx="3" />
    <path d="M7 10v8M7 7v.01M11 18v-5a2 2 0 0 1 4 0v5M11 11v7" stroke="#18181B" strokeWidth={2} strokeLinecap="round" fill="none" />
  </Icon>
)
export const IconInstagram = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
  </Icon>
)
