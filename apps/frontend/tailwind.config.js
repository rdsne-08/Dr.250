/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f8fcfa',
        ink: {
          50: '#f3f7f5',
          100: '#e2ebe7',
          300: '#9bb0a8',
          500: '#587169',
          700: '#29483f',
          800: '#1f3932',
          900: '#142c25',
          950: '#0d211b',
        },
        health: {
          50: '#eefbf6',
          100: '#d7f5e8',
          200: '#b1ead4',
          300: '#7dd9b9',
          400: '#46c39a',
          500: '#20a97f',
          600: '#168867',
          700: '#146d55',
          800: '#135745',
          900: '#104839',
        },
        medical: {
          50: '#effcfb',
          100: '#d5f6f3',
          200: '#afece7',
          300: '#7bdcd5',
          400: '#43c4bd',
          500: '#29aaa4',
          600: '#208985',
          700: '#206e6b',
          800: '#205856',
          900: '#1f4948',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans Bengali',
          'Hind Siliguri',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 20px 60px -28px rgba(18, 91, 69, 0.24)',
        card: '0 12px 40px -24px rgba(15, 70, 55, 0.22)',
        lift: '0 24px 55px -28px rgba(18, 110, 82, 0.34)',
      },
      maxWidth: {
        content: '76rem',
      },
    },
  },
  plugins: [],
};
