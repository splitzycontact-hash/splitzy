import { m } from 'framer-motion'

interface CheckboxProps {
  checked: boolean
  onChange?: () => void
  disabled?: boolean
}

export function Checkbox({ checked, onChange, disabled = false }: CheckboxProps) {
  return (
    <m.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.88 }}
      className={`
        w-6 h-6 min-w-[24px] min-h-[24px] rounded-md flex items-center justify-center
        border-2 transition-colors duration-150 flex-shrink-0
        ${checked ? 'bg-brand border-brand' : 'bg-white border-border'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {checked && (
        <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
          <path
            d="M1.5 5L5 8.5L11.5 1.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </m.button>
  )
}
