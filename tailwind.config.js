import { fontFamily } from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'oklch(0.205 0 0)',
      },
      ringColor: {
        DEFAULT: 'oklch(0.205 0 0)', // match --primary
      },
      // fontFamily removed to fix build error
      // sans: ['var(--font-sans)'],
      // mono: ['var(--font-mono)'],
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
}
