/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          400: '#39ff88',
          500: '#00ff66',
          600: '#00d656',
        },
        ink: {
          950: '#050607',
          900: '#070a0b',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        neon:
          '0 0 0 1px rgba(0,255,102,0.35), 0 0 22px rgba(0,255,102,0.22), 0 0 60px rgba(0,255,102,0.12)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(57,255,136,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(57,255,136,0.08) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
