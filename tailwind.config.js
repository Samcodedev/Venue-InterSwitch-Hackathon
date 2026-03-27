/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        "background-alt": "var(--bg-alt)",
        surface: "var(--surface)",
        "surface-strong": "var(--surface-strong)",
        "surface-border": "var(--surface-border)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        teal: {
          DEFAULT: "var(--teal)",
          deep: "var(--teal-deep)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          soft: "var(--amber-soft)",
        },
        danger: "var(--danger)",
        success: "var(--success)",
        warning: "var(--warning)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      fontFamily: {
        sans: ["Outfit", "Segoe UI", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
      },
      boxShadow: {
        soft: "var(--shadow)",
      }
    },
  },
  plugins: [],
}
