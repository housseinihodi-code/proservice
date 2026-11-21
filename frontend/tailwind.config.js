/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef4ff", 100: "#dbe6ff", 200: "#bfd3ff", 300: "#93b4fd", 400: "#5f8cf8",
          500: "#3866f0", 600: "#2450d8", 700: "#1d3fae", 800: "#1c378a", 900: "#0f2a5c", 950: "#0a1b3d",
        },
        accent: {
          50: "#fff4ef", 100: "#ffe5d9", 200: "#ffc9b0", 300: "#ffa985", 400: "#ff8a5c",
          500: "#ff6b35", 600: "#ec5420", 700: "#c4421a",
        },
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #0a1b3d 0%, #0f2a5c 45%, #1d3fae 100%)",
        "accent-gradient": "linear-gradient(135deg, #ff8a5c 0%, #ff6b35 50%, #ec5420 100%)",
        "primary-gradient": "linear-gradient(135deg, #2450d8 0%, #1d3fae 100%)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,42,92,.04), 0 4px 16px -4px rgba(15,42,92,.08)",
        lift: "0 2px 4px rgba(15,42,92,.04), 0 18px 40px -12px rgba(15,42,92,.22)",
        glow: "0 10px 30px -8px rgba(255,107,53,.55)",
        "glow-primary": "0 10px 30px -8px rgba(36,80,216,.5)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: 0, transform: "translateY(24px)" }, "100%": { opacity: 1, transform: "none" } },
        "fade-in": { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        "scale-in": { "0%": { opacity: 0, transform: "scale(.96) translateY(-4px)" }, "100%": { opacity: 1, transform: "none" } },
        "sheet-up": { "0%": { transform: "translateY(100%)" }, "100%": { transform: "none" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        blob: {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(40px,-30px) scale(1.08)" },
          "66%": { transform: "translate(-30px,25px) scale(.95)" },
        },
        "gradient-x": { "0%,100%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" } },
        "pulse-ring": { "0%": { transform: "scale(.9)", opacity: .7 }, "100%": { transform: "scale(1.8)", opacity: 0 } },
      },
      animation: {
        "fade-up": "fade-up .7s cubic-bezier(.22,1,.36,1) both",
        "fade-in": "fade-in .5s ease-out both",
        "scale-in": "scale-in .18s cubic-bezier(.22,1,.36,1) both",
        "sheet-up": "sheet-up .35s cubic-bezier(.22,1,.36,1) both",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 9s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        blob: "blob 18s ease-in-out infinite",
        "gradient-x": "gradient-x 8s ease infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(.22,1,.36,1) infinite",
      },
    },
  },
  plugins: [],
};
