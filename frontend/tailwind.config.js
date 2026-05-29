/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'DM Mono'", "Courier New", "monospace"],
        sans: ["'DM Sans'", "Segoe UI", "sans-serif"],
      },
      colors: {
        primary: "#1a1a2e",
        accent: "#e63946",
        "accent-light": "#fde8ea",
        surface: "#f8f7f4",
        border: "#e2e0da",
        muted: "#6b6a66",
      },
    },
  },
  plugins: [],
};
