/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kpit: {
          green: '#00A859',
          greenHover: '#008f4c',
          greenLight: '#E8F7F0',
          purple: '#3B1C54',
          purpleHover: '#2E1542',
          purpleLight: '#F3E8FF',
          dark: '#1C0D2A'
        }
      }
    },
  },
  plugins: [],
}
