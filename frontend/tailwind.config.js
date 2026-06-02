/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f9f5ff',
          100: '#f3ebff',
          200: '#e9d5ff',
          300: '#d8b4ff',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        accent: '#8b5cf6',
        surface: '#eef2ff',
        border: '#c4b5fd',
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#0f172a',
          },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
