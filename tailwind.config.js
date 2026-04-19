/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,html}", "./index.html"],
  theme: {
    extend: {
      fontFamily: {
        display: [
          "var(--moment-font, 'Pretendard')",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      fontSize: {
        clock: ["11rem", { lineHeight: "1", letterSpacing: "-0.04em" }],
      },
      colors: {
        ink: {
          50: "rgba(255,255,255,0.95)",
          100: "rgba(255,255,255,0.85)",
          200: "rgba(255,255,255,0.70)",
          300: "rgba(255,255,255,0.55)",
          400: "rgba(255,255,255,0.40)",
          500: "rgba(255,255,255,0.25)",
        },
        glass: {
          DEFAULT: "rgba(20,20,20,0.55)",
          strong: "rgba(15,15,15,0.75)",
          soft: "rgba(255,255,255,0.08)",
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "fade-in": "fadeIn 600ms ease-out both",
        "fade-up": "fadeUp 700ms cubic-bezier(0.22,1,0.36,1) both",
        "scale-in": "scaleIn 300ms cubic-bezier(0.22,1,0.36,1) both",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
