/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './entrypoints/**/*.{html,ts,tsx}',
    './src/**/*.{html,ts,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#edf5f1',
          100: '#dcebe3',
          200: '#bfd9cc',
          300: '#98c3af',
          400: '#71ae92',
          500: '#367d60',
          600: '#18553f',
          700: '#124b3b',
          800: '#113e32',
          900: '#0e3028',
          950: '#08221c'
        },
        gray: {
          50: '#f7f8f9',
          100: '#f0f2f4',
          200: '#e4e8ec',
          300: '#cfd6dd',
          400: '#9aa4af',
          500: '#697482',
          600: '#4c5765',
          700: '#35404b',
          800: '#242e34',
          900: '#121b1e'
        }
      }
    },
  },
  plugins: [],
}
