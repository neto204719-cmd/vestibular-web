/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans:    ['"General Sans"', 'system-ui', 'sans-serif'],
        heading: ['"Satoshi"', '"General Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          0: 'rgb(var(--s0) / <alpha-value>)',
          1: 'rgb(var(--s1) / <alpha-value>)',
          2: 'rgb(var(--s2) / <alpha-value>)',
          3: 'rgb(var(--s3) / <alpha-value>)',
          4: 'rgb(var(--s4) / <alpha-value>)',
          5: 'rgb(var(--s5) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          hover:   'rgb(var(--accent-hover-rgb) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
          2:       'rgb(var(--ink2-rgb) / <alpha-value>)',
          3:       'rgb(var(--ink3-rgb) / <alpha-value>)',
          4:       'rgb(var(--ink4-rgb) / <alpha-value>)',
        },
        success: '#22c55e',
        error:   '#ef4444',
        warning: '#f59e0b',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      animation: {
        'fade-in':        'fadeIn .3s ease-out',
        'slide-up':       'slideUp .35s cubic-bezier(.16,1,.3,1)',
        'scale-in':       'scaleIn .25s ease-out',
        'slide-in-right': 'slideInRight .3s cubic-bezier(.16,1,.3,1)',
        'shimmer':        'shimmer 2s ease-in-out infinite',
        'glow-pulse':     'glowPulse 2.5s ease-in-out infinite',
        'progress-fill':  'progressFill .8s cubic-bezier(.16,1,.3,1) forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px 0 rgb(var(--accent-rgb) / 0.3)' },
          '50%':      { boxShadow: '0 0 20px 4px rgb(var(--accent-rgb) / 0.15)' },
        },
        progressFill: {
          from: { width: '0%' },
        },
      },
    },
  },
  plugins: [],
}
