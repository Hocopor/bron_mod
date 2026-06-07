/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#fdfaf3',
          100: '#faf3e0',
          200: '#f5e6c8',
          300: '#edd9a3',
          400: '#e3c570',
          500: '#d9a83a',
          600: '#c4912e',
          700: '#a37426',
          800: '#845d24',
          900: '#6b4c21',
        },
        sea: {
          50: '#edf8ff',
          100: '#d6edfd',
          200: '#b5e0fb',
          300: '#83cef8',
          400: '#49b3f3',
          500: '#2196e9',
          600: '#1375ce',
          700: '#1a6b8a',
          800: '#1a5a6e',
          900: '#1c4c5c',
        },
        coral: {
          50: '#fff4f2',
          100: '#ffe6e2',
          200: '#ffd0c9',
          300: '#ffaea3',
          400: '#ff7f6e',
          500: '#e8735a',
          600: '#d45a40',
          700: '#b24432',
          800: '#943a2e',
          900: '#7a342c',
        },
        deep: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0d4b63',
          800: '#0c3a50',
          900: '#0a2d40',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'wave': 'wave 8s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        wave: {
          '0%, 100%': { transform: 'translateX(0) scaleY(1)' },
          '50%': { transform: 'translateX(-25px) scaleY(1.1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-pattern': "url('/images/general/hero-bg.jpg')",
      },
      boxShadow: {
        'sea': '0 4px 30px rgba(26, 107, 138, 0.2)',
        'card': '0 10px 40px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 20px 60px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
