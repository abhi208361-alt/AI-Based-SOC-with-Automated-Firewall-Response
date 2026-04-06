/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        socbg: "#0b1020",
        card: "#121a2f",
        accent: "#00d4ff",
        danger: "#ff4d6d",
        warn: "#ffb020",
        success: "#22c55e"
      }
    }
  },
  plugins: []
};