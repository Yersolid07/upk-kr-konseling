// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream:        '#FDF8F2',
        'cream-dark': '#F0E6D3',
        brown: {
          DEFAULT: '#7C5C3E',
          light:   '#A07850',
          dark:    '#4A3020',
        },
        terra: {
          DEFAULT: '#C4895A',
          light:   '#E8B48A',
        },
        sage: {
          DEFAULT: '#6B8C72',
          light:   '#A8C4AE',
        },
        gold: {
          DEFAULT: '#C9993A',
          light:   '#E8CC80',
        },
      },
      fontFamily: {
        playfair: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans:     ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '16px',
        sm: '10px',
        lg: '20px',
        xl: '24px',
      },
      boxShadow: {
        card:   '0 2px 20px rgba(124,92,62,0.10)',
        'card-md': '0 4px 30px rgba(124,92,62,0.15)',
        'card-lg': '0 8px 40px rgba(124,92,62,0.20)',
      },
    },
  },
  plugins: [],
}

export default config
