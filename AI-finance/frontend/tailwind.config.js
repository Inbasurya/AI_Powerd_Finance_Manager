/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070b14",
          900: "#0d1526",
          800: "#12203a"
        },
        tide: {
          500: "#0fa3b1",
          400: "#38b8c8",
          300: "#8be0e8"
        },
        coral: {
          500: "#f26a4b",
          400: "#ff8a6f"
        },
        moss: {
          500: "#6fa86b"
        }
      },
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["Manrope", "sans-serif"]
      },
      boxShadow: {
        glass: "0 18px 45px rgba(6, 11, 20, 0.35)"
      }
    }
  },
  plugins: [],
};
