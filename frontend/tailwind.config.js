/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Every neutral / brand shade is a CSS variable (R G B channels) so the
        // desktop site can wear the light "ocean" theme (html.ocean, set in
        // main.tsx) while the phone app keeps the original chart-paper palette.
        // The defaults live in :root and the ocean values in html.ocean, both
        // in src/index.css.
        paper: {
          50: "rgb(var(--c-paper-50) / <alpha-value>)",
          100: "rgb(var(--c-paper-100) / <alpha-value>)",
          150: "rgb(var(--c-paper-150) / <alpha-value>)",
          200: "rgb(var(--c-paper-200) / <alpha-value>)",
          300: "rgb(var(--c-paper-300) / <alpha-value>)",
          400: "rgb(var(--c-paper-400) / <alpha-value>)",
        },
        ink: {
          900: "rgb(var(--c-ink-900) / <alpha-value>)",
          800: "rgb(var(--c-ink-800) / <alpha-value>)",
          700: "rgb(var(--c-ink-700) / <alpha-value>)",
          600: "rgb(var(--c-ink-600) / <alpha-value>)",
          500: "rgb(var(--c-ink-500) / <alpha-value>)",
          400: "rgb(var(--c-ink-400) / <alpha-value>)",
          300: "rgb(var(--c-ink-300) / <alpha-value>)",
        },
        chart: {
          700: "rgb(var(--c-chart-700) / <alpha-value>)",
          600: "rgb(var(--c-chart-600) / <alpha-value>)",
          500: "rgb(var(--c-chart-500) / <alpha-value>)",
          300: "rgb(var(--c-chart-300) / <alpha-value>)",
          100: "rgb(var(--c-chart-100) / <alpha-value>)",
        },
        signal: "rgb(var(--c-signal) / <alpha-value>)",
        // Extra accents used by the ocean theme for the colour "mix".
        sun: "#FFB640",
        aqua: "#12B5C8",
        coral: "#F26B4E",
        risk: {
          low: "#1D7A50",
          moderate: "#A17000",
          high: "#BF4E12",
          extreme: "#AF2318",
        },
      },
      fontFamily: {
        display: [
          '"Fraunces Variable"',
          '"Noto Serif Devanagari Variable"',
          "Georgia",
          "serif",
        ],
        sans: [
          '"Archivo Variable"',
          '"Segoe UI"',
          '"Nirmala UI"',
          "system-ui",
          "sans-serif",
        ],
        mono: ['"Spline Sans Mono Variable"', '"Nirmala UI"', "Consolas", "monospace"],
      },
      // Transform-only entrances, deliberately: an animation that starts at
      // opacity 0 with fill-mode both leaves content INVISIBLE if animations
      // never run (hidden tab, some projectors) — and these carry safety data.
      keyframes: {
        rise: {
          "0%": { transform: "translateY(8px)" },
          "100%": { transform: "translateY(0)" },
        },
        stampIn: {
          "0%": { transform: "scale(1.3) rotate(-5deg)" },
          "60%": { transform: "scale(0.96) rotate(-1.4deg)" },
          "100%": { transform: "scale(1) rotate(-2deg)" },
        },
      },
      animation: {
        rise: "rise .35s ease-out both",
        stampIn: "stampIn .45s cubic-bezier(.2,.9,.3,1.2) both",
      },
    },
  },
  plugins: [],
};