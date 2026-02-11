import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'tree-fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'tree-node-appear': {
          '0%': { opacity: '0', transform: 'scale(0.85) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'connector-draw': {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(15,118,110,0.3)' },
          '50%': { boxShadow: '0 0 0 8px rgba(15,118,110,0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in-from-top': 'slide-in-from-top 0.2s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
        'dropdown': 'slide-in-from-top 0.2s ease-out, fade-in 0.2s ease-out',
        'tree-fade-in': 'tree-fade-in 0.4s ease-out both',
        'tree-node-appear': 'tree-node-appear 0.4s ease-out both',
        'connector-draw': 'connector-draw 0.8s ease-out both',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        family: {
          "primary": "#0f766e",
          "secondary": "#ea580c",
          "accent": "#84cc16",
          "neutral": "#0f172a",
          "base-100": "#f8fafc",
          "base-200": "#f1f5f9",
          "base-300": "#e2e8f0",
          "info": "#0284c7",
          "success": "#16a34a",
          "warning": "#f59e0b",
          "error": "#dc2626",
        },
      },
      {
        "family-dark": {
          "primary": "#14b8a6",
          "secondary": "#fb923c",
          "accent": "#a3e635",
          "neutral": "#1e293b",
          "base-100": "#0f172a",
          "base-200": "#1e293b",
          "base-300": "#334155",
          "base-content": "#e2e8f0",
          "info": "#38bdf8",
          "success": "#4ade80",
          "warning": "#fbbf24",
          "error": "#f87171",
        },
      },
      "light",
      "dark",
    ],
    defaultTheme: "family",
  },
}
