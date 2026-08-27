import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: { navy: "#102A43", orange: "#FF6B1A", warm: "#F7F9FC", slate: "#52667A", success: "#20A66A" },
      borderRadius: { "4xl": "2rem" },
      boxShadow: { lift: "0 22px 60px rgba(16,42,67,.13)", soft: "0 10px 30px rgba(16,42,67,.08)" },
      fontFamily: { sans: ["var(--font-geist)", "Arial", "sans-serif"] },
      keyframes: { rise: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } } },
      animation: { rise: "rise .5s ease-out both" },
    },
  },
  plugins: [],
} satisfies Config;
