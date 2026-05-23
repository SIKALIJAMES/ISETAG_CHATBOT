/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        isetag: {
          yellow:  '#EAE74A',
          yellowDark: '#C9C620',
          green:   '#5DCB6A',
          greenDark: '#3BA848',
          black:   '#0C0C0C',
          dark:    '#141414',
          panel:   '#1A1A1A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.35s ease-out',
        'fade-up':  'fadeUp 0.4s ease-out',
      },
      keyframes: {
        slideIn: { '0%': { transform: 'translateX(-12px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        fadeUp:  { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)',  opacity: '1' } },
      }
    },
  },
  plugins: [],
}
