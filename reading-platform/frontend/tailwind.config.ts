import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#161C24',
          700: '#232B36',
          50: '#F7F5F0',
        },
        linen: {
          100: '#EDEAE1',
          200: '#E2DED2',
        },
        brass: {
          400: '#CBA05C',
          500: '#B8863B',
          600: '#96692A',
        },
        moss: {
          500: '#4E7060',
          600: '#3F5D4E',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
        reading: ['var(--font-reading)', 'Georgia', 'serif'],
      },
      boxShadow: {
        shelf: '0 18px 24px -20px rgba(22, 28, 36, 0.45)',
        spine: '-3px 0 6px -2px rgba(0,0,0,0.35) inset',
      },
    },
  },
  plugins: [],
};

export default config;
