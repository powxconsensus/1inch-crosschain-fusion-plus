import type { Config } from 'tailwindcss';
const { fontFamily } = require('tailwindcss/defaultTheme');

const config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-clash)', ...fontFamily.sans],
      },
      // fontFamily: {
      //   sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      //   serif: ['Merriweather', 'ui-serif', 'Georgia'],
      //   mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular'],
      // },
      colors: {
        background: 'rgb(var(--background) / <alpha-value>)',
        background_secondary: 'rgb(var(--background_secondary) / <alpha-value>)',
        cta_color: 'rgb(var(--cta_color) / <alpha-value>)',
        border_color: 'rgb(var(--border_color) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        secondary: 'rgb(var(--secondary) / <alpha-value>)',
      },
      screens: {
        xs: '475px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
      maxWidth: {
        '8xl': '85rem', // 1440px
        '9xl': '93rem', // 1536px
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

export default config;
