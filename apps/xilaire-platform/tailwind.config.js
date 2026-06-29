/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // Enables <html class="dark"> theme switching

  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        // You can now use "bg-app", "bg-app-dark", etc.
        app: {
          light: "#f8f9fb",
          dark: "#0A233F",
        },
      },

      transitionProperty: {
        theme: "color, background-color, border-color, fill, stroke",
      },

      transitionDuration: {
        250: "250ms",
      },

      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },

  plugins: [],
};
