/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        surface: {
          0: 'rgb(var(--s0) / <alpha-value>)',
          1: 'rgb(var(--s1) / <alpha-value>)',
          2: 'rgb(var(--s2) / <alpha-value>)',
          3: 'rgb(var(--s3) / <alpha-value>)',
          4: 'rgb(var(--s4) / <alpha-value>)',
          5: 'rgb(var(--s5) / <alpha-value>)',
        },
        accent:  {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          hover:   'rgb(var(--accent-hover-rgb) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
          2:       'rgb(var(--ink2-rgb) / <alpha-value>)',
          3:       'rgb(var(--ink3-rgb) / <alpha-value>)',
          4:       'rgb(var(--ink4-rgb) / <alpha-value>)',
        },
        success: '#22c55e', error: '#ef4444', warning: '#f59e0b',
      },
      animation: {
        'fade-in':  'fadeIn .2s ease-out',
        'slide-up': 'slideUp .25s cubic-bezier(.16,1,.3,1)',
        'scale-in': 'scaleIn .18s ease-out',
      },
      keyframes: {
        fadeIn:  { from:{opacity:'0'}, to:{opacity:'1'} },
        slideUp: { from:{opacity:'0',transform:'translateY(8px)'}, to:{opacity:'1',transform:'translateY(0)'} },
        scaleIn: { from:{opacity:'0',transform:'scale(.96)'}, to:{opacity:'1',transform:'scale(1)'} },
      },
    },
  },
  plugins: [],
}
