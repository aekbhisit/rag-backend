/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5',
        accent: '#10B981',
        info: '#0EA5E9',
        warning: '#F59E0B',
        danger: '#E11D48',
      },
      borderRadius: { md: '8px', lg: '12px' },
      boxShadow: {
        md: '0 2px 8px rgba(0,0,0,.08)'
      }
    },
  },
  plugins: [],
}

