/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // CryptoCrush Theme - Dark Cyberpunk Trading
        primary: {
          DEFAULT: '#00ff88',
          50: '#e6fff3',
          100: '#b3ffe0',
          200: '#80ffcd',
          300: '#4dffba',
          400: '#1affa7',
          500: '#00ff88',
          600: '#00cc6d',
          700: '#009952',
          800: '#006636',
          900: '#00331b',
        },
        danger: {
          DEFAULT: '#ff4757',
          50: '#ffe9eb',
          100: '#ffc4c9',
          200: '#ff9fa7',
          300: '#ff7a85',
          400: '#ff5563',
          500: '#ff4757',
          600: '#cc3946',
          700: '#992b34',
          800: '#661c23',
          900: '#330e11',
        },
        dark: {
          DEFAULT: '#0a0a0f',
          50: '#1a1a24',
          100: '#15151e',
          200: '#111118',
          300: '#0d0d12',
          400: '#0a0a0f',
          500: '#08080c',
          600: '#050508',
          700: '#030304',
          800: '#010101',
          900: '#000000',
        },
        neon: {
          green: '#00ff88',
          red: '#ff4757',
          blue: '#00d4ff',
          purple: '#a855f7',
          yellow: '#fbbf24',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'bounce-in': 'bounce-in 0.5s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 255, 136, 0.6)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'neon-green': '0 0 20px rgba(0, 255, 136, 0.5)',
        'neon-red': '0 0 20px rgba(255, 71, 87, 0.5)',
        'neon-blue': '0 0 20px rgba(0, 212, 255, 0.5)',
      },
    },
  },
  plugins: [],
}
