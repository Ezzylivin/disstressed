/** @type {import('tailwindcss').Config} */
module.exports = {
  // This tells Tailwind exactly which files to scan for layout style utilities
  content: [
    "./public/index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Chivo', 'sans-serif'],
        'mono-pi': ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
