/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#f7f3ec",
        ink: "#1f2937",
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        accent: "#5b5bd6",
        champagne: "#b7923b",
        neural: "#2563eb",
        emerald: "#10b981",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        serif: ["Instrument Serif", "Playfair Display", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glass: "0 24px 70px rgba(31,41,55,0.08), inset 0 1px 0 rgba(255,255,255,0.75)",
        lift: "0 18px 50px rgba(31,41,55,0.12)",
      },
    },
  },
  plugins: [],
};
