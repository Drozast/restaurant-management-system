/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Nueva paleta gourmet
        primary: {
          DEFAULT: '#86C232', // Verde suave gourmet (botones/CTAs)
          dark: '#61892F',    // Verde oliva oscuro (acentos)
        },
        background: {
          DEFAULT: '#FAFAFA', // Blanco cálido
          dark: '#1A1A1A',    // Negro suave
        },
        text: {
          primary: '#1A1A1A',   // Negro suave (titulares)
          secondary: '#222629', // Gris carbón (texto secundario)
        },
        border: '#CFCFCF',      // Gris claro (líneas, bordes)
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Manrope', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
