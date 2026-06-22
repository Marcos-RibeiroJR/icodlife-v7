/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          deep:    '#7B1E1E',
          primary: '#B91C1C',
          medium:  '#DC2626',
          light:   '#FEE2E2',
          bg:      '#FFF8F8',
          rose:    '#FCA5A5',
          muted:   '#FEF2F2',
        },
        health: {
          normal:   '#16A34A',
          warning:  '#D97706',
          critical: '#DC2626',
          low:      '#0891B2',
          pending:  '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
