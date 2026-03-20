/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C63FF',
          dark: '#5A52D5',
          light: '#8B84FF',
        },
        secondary: {
          DEFAULT: '#FF6584',
          dark: '#D94F6A',
        },
        accent: '#43E97B',
        background: {
          DEFAULT: '#0F0F1A',
          card: '#1A1A2E',
          elevated: '#252540',
        },
        xp: '#FFD700',
      },
      fontFamily: {
        sans: ['SpaceMono'],
      },
    },
  },
  plugins: [],
};
