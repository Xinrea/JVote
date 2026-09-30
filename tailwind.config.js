/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}", './node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'],

  theme: {
    extend: {
      colors: {
        // flowbite-svelte
        primary: {
          50: '#fff5f8',
          100: '#ffe9f0',
          200: '#ffd0df',
          300: '#ffacc7',
          400: '#ff79a4',
          500: '#fc3171',
          600: '#e92663',
          700: '#c91d54',
          800: '#a61d49',
          900: '#8b1e41'
        }
      }
    }
  },

  plugins: [require("@tailwindcss/typography"), require('flowbite/plugin')]
};