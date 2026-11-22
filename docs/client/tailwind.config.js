/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { canvas: 'var(--nd-canvas)', surface: 'var(--nd-surface)', 'surface-raised': 'var(--nd-surface-raised)', overlay: 'var(--nd-overlay)', 'text-primary': 'var(--nd-text-primary)', 'text-secondary': 'var(--nd-text-secondary)', 'text-muted': 'var(--nd-text-muted)', action: 'var(--nd-action)', teal: 'var(--nd-teal)', sunrise: 'var(--nd-sunrise)', danger: 'var(--nd-danger)' }, fontFamily: { sans: ['DM Sans', 'Noto Sans Kannada', 'sans-serif'], display: ['Plus Jakarta Sans', 'Noto Sans Kannada', 'sans-serif'] }, spacing: { 'nd-1': 'var(--nd-space-1)', 'nd-2': 'var(--nd-space-2)', 'nd-3': 'var(--nd-space-3)', 'nd-4': 'var(--nd-space-4)', 'nd-5': 'var(--nd-space-5)', 'nd-6': 'var(--nd-space-6)', 'nd-8': 'var(--nd-space-8)', 'nd-10': 'var(--nd-space-10)', 'nd-12': 'var(--nd-space-12)' }, borderRadius: { control: 'var(--nd-radius-control)', compact: 'var(--nd-radius-compact)', surface: 'var(--nd-radius-surface)', pill: 'var(--nd-radius-pill)' }, boxShadow: { surface: 'var(--nd-shadow)' } } },
  plugins: [],
};
