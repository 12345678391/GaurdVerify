/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#101B2D',
          hover: '#0A1220',
        },
        secondary: {
          DEFAULT: '#26364B',
          hover: '#1D2A3B',
        },
        surface: {
          DEFAULT: '#F4F6F8',
          card: '#FFFFFF',
        },
        enterprise: {
          blue: '#2563EB',
          navy: '#101B2D',
          slate: '#26364B',
          darkText: '#1E293B',
          mutedText: '#64748B',
          border: '#E2E8F0',
        },
        navy: {
          950: '#101B2D',
          900: '#101B2D',
          850: '#1A2638',
          800: '#26364B',
          750: '#33455D',
          700: '#E2E8F0',
          600: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        elevated: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
