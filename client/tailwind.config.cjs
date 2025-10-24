module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1F7A6B",
          light: "#32C4A2",
          dark: "#14594C",
        },
        accent: "#FF8A36",
        surface: "#0F1115",
        "surface-alt": "#14171D",
      },
      boxShadow: {
        glow: "0 0 20px rgba(50, 196, 162, 0.35)",
      },
    },
  },
  plugins: [],
};
