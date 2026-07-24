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
        teal: {
          deep:    '#0B4F47',
          primary: '#0F766E',
          medium:  '#0D9488',
          light:   '#CCFBF1',
          soft:    '#F0FDFA',
        },
        ink: {
          950: '#0B0F14',
          900: '#10151C',
          800: '#171F29',
          700: '#212B38',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
