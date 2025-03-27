import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
      },
      colors: {
        green: {
          50:  '#e6f5ef',
          100: '#ceeadf',
          200: '#a0d5c0',
          300: '#71c0a1',
          400: '#42ab82',
          500: '#00754a',
          600: '#00623e',
          700: '#004f32',
          800: '#003c26',
          900: '#00291a',
          950: '#001a10',
        }
      },
    },
    keyframes: {
      shimmer: {
        '100%': {
          transform: 'translateX(100%)',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
export default config;
