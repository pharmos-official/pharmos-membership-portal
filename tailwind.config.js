/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pharmos: {
          50: '#eef7fb',
          100: '#d4ecf5',
          200: '#a8d8eb',
          300: '#6fbdd9',
          400: '#3a9cbf',
          500: '#006B8F',
          600: '#005a78',
          700: '#004861',
          800: '#00374c',
          900: '#002838',
        },
        gold: {
          50: '#fef8ec',
          100: '#fdedc8',
          200: '#fad88e',
          300: '#f7bd53',
          400: '#F5A623',
          500: '#d98c0a',
          600: '#b06e05',
          700: '#855506',
          800: '#5e3d06',
          900: '#3d2906',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,43,56,0.06), 0 4px 16px rgba(0,43,56,0.06)',
        'card-hover': '0 2px 6px rgba(0,43,56,0.08), 0 8px 28px rgba(0,43,56,0.10)',
      },
    },
  },
  plugins: [],
};
