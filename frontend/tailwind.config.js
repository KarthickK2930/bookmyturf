module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
          400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
          800: '#166534', 900: '#14532d',
        },
        accent: { DEFAULT: '#f59e0b', dark: '#d97706' },
        sport: { blue: '#1e40af', dark: '#1a1a2e' },
        danger: '#ef4444',
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        modal: '16px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.08)',
        elevated: '0 8px 24px rgba(0,0,0,0.12)',
        floating: '0 4px 12px rgba(22,163,74,0.3)',
        'floating-lg': '0 8px 24px rgba(22,163,74,0.35)',
      },
      animation: {
        'bounce-ball': 'bounce-ball 0.8s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'slot-pop': 'slot-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

