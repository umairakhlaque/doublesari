/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'table-green': '#064e3b',
        'table-felt': '#065f46',
        'gold': {
          400: '#fbbf24',
          500: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'card-deal': 'cardDeal 0.3s ease-out',
        'pile-pulse': 'pulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
