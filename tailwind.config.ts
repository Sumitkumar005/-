import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0A1628", 2: "#13233B", 3: "#1D3354", soft: "#33415C" },
        paper: "#F6F7F9",
        line: "#E4E7EC",
        muted: "#5B6474",
        marigold: { DEFAULT: "#FFB21E", deep: "#E08E00", soft: "#FFF4DB" },
        mint: { DEFAULT: "#12B76A", deep: "#067647", soft: "#E3F8EC" },
        coral: { DEFAULT: "#E5484D", soft: "#FDECEC" },
        sky: { DEFAULT: "#2E90FA", soft: "#E8F2FF" },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Bricolage Grotesque", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,22,40,0.04), 0 1px 3px rgba(10,22,40,0.06)",
        lift: "0 10px 30px -12px rgba(10,22,40,0.25)",
        glow: "0 0 0 4px rgba(255,178,30,0.18)",
      },
      borderRadius: { xl: "14px", "2xl": "20px" },
      keyframes: {
        pulseDot: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.35" } },
        rise: { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: {
        pulseDot: "pulseDot 1.4s ease-in-out infinite",
        rise: "rise .35s ease-out both",
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
