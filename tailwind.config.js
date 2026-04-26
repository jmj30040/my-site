/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ow: {
          bg: "#080B12",
          panel: "#111827",
          card: "#172033",
          orange: "#F99E1A",
          cyan: "#3DD6E8"
        }
      },
      boxShadow: {
        glow: "0 0 30px rgba(249, 158, 26, 0.16)"
      }
    }
  },
  plugins: []
};
