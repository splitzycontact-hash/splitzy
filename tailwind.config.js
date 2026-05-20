/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#E8920A',
          dark: '#B45309',
          light: '#FEF3C7',
          bg: '#FFFBF2',
          glow: 'rgba(232,146,10,0.32)',
        },
        dark: {
          DEFAULT: '#111827',
          hero: '#18181B',
          charcoal: '#0f0f0f',
        },
        mid: '#374151',
        muted: '#9CA3AF',
        border: '#E5E7EB',
        bg: '#F4F4F5',
        success: '#22C55E',
        error: '#EF4444',
        ink: {
          50:  '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
        },
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
        '5xl': '44px',
      },
      boxShadow: {
        glow: '0 0 0 4px rgba(232,146,10,0.32)',
        card: '0 4px 24px rgba(0,0,0,0.08)',
        'card-dark': '0 8px 32px rgba(0,0,0,0.24)',
      },
    },
  },
  plugins: [],
}
