/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#0a0a0f',
          50: '#10101a',
          100: '#14141f',
          200: '#1a1a28',
          300: '#22222f',
        },
        accent: {
          DEFAULT: '#22d3ee',
          hover: '#06b6d4',
          muted: 'rgba(34, 211, 238, 0.1)',
        },
        status: {
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        },
        border: {
          DEFAULT: '#1e1e2e',
          hover: '#2a2a3e',
        },
      },
    },
  },
  plugins: [],
}
