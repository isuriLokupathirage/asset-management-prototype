export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D',
          400: '#FBBF24', 500: '#F9B115', 600: '#D97706', 700: '#B45309'
        },
        ink: '#0F172A',
        muted: '#64748B',
        subtle: '#94A3B8',
        line: '#E5E9F0',
        canvas: '#F7F8FA'
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        pop: '0 10px 30px -10px rgb(15 23 42 / 0.20)'
      },
      borderRadius: { xl: '0.75rem' }
    }
  },
  plugins: []
};
