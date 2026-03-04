/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        // Semantic design tokens (backed by CSS variables)
        surface: 'var(--color-surface)',
        'surface-raised': 'var(--color-surface-raised)',
        'surface-sunken': 'var(--color-surface-sunken)',
        'surface-overlay': 'var(--color-surface-overlay)',
        'on-surface': 'var(--color-on-surface)',
        'on-surface-muted': 'var(--color-on-surface-muted)',
        'on-surface-subtle': 'var(--color-on-surface-subtle)',
        border: 'var(--color-border)',
        'border-subtle': 'var(--color-border-subtle)',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        'accent-fg': 'var(--color-accent-fg)',
        danger: 'var(--color-danger)',
        'danger-fg': 'var(--color-danger-fg)',
        warning: 'var(--color-warning)',
        'warning-fg': 'var(--color-warning-fg)',
        success: 'var(--color-success)',
        'success-fg': 'var(--color-success-fg)',
        // Keep sprint colors
        sprint: { green: '#22c55e', yellow: '#eab308', orange: '#f97316', red: '#ef4444' }
      }
    }
  },
  plugins: [],
};
