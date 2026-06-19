import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14213d",
        paper: "#f7f9fc",
        "surface-bright": "#f8f9ff",
        "surface-muted": "#eff4ff",
        "line-soft": "#e5e7eb",
        brand: {
          50: "#eef6ff",
          100: "#d8ebff",
          200: "#b8d7ff",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
          900: "#00174b"
        },
        success: {
          50: "#ecfdf5",
          500: "#10b981",
          700: "#047857"
        },
        warning: {
          50: "#fffbeb",
          500: "#f59e0b",
          700: "#b45309"
        },
        violet: {
          500: "#7c3aed",
          600: "#6d28d9"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(20, 33, 61, 0.08)",
        card: "0 4px 12px rgba(15, 23, 42, 0.05)",
        lifted: "0 14px 34px rgba(15, 23, 42, 0.12)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem"
      }
    }
  },
  plugins: []
};

export default config;
