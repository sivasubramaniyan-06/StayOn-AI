/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './index.html'
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        stayon: {
          purple: "#6C5CE7",
          "purple-light": "#A29BFE",
          lavender: "#E8E5FF",
          pink: "#FD79A8",
          peach: "#FFEAA7",
          blue: "#74B9FF",
          sky: "#81ECEC",
          card: "rgba(255, 255, 255, 0.75)",
          "card-hover": "rgba(255, 255, 255, 0.90)",
          border: "rgba(255, 255, 255, 0.60)",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
      boxShadow: {
        'stayon': '0 8px 32px 0 rgba(108, 92, 231, 0.08), 0 2px 8px 0 rgba(0, 0, 0, 0.04)',
        'stayon-glow': '0 0 20px rgba(108, 92, 231, 0.25)',
        'stayon-card': '0 4px 20px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
      },
      backgroundImage: {
        'pastel-space': 'radial-gradient(ellipse at 10% 10%, rgba(216, 206, 255, 0.5) 0%, rgba(255, 230, 240, 0.4) 40%, rgba(230, 245, 255, 0.5) 80%)',
        'stayon-gradient': 'linear-gradient(135deg, #6C5CE7 0%, #8C7AE6 50%, #9B51E0 100%)',
        'stayon-subtle-gradient': 'linear-gradient(135deg, #F3F0FF 0%, #F9F5FF 50%, #FFF5FB 100%)',
      },
      keyframes: {
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.85 }
        }
      },
      animation: {
        "float": "float 4s ease-in-out infinite",
        "pulse-subtle": "pulse-subtle 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
