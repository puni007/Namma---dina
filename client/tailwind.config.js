/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { night: '#070B1F', surface: '#101B36', 'surface-soft': '#14213F', aurora: '#67E8D0', emerald: '#34D399', violet: '#A78BFA', sky: '#7DD3FC' }, fontFamily: { sans: ['DM Sans', 'Noto Sans Kannada', 'sans-serif'] }, boxShadow: { glow: '0 0 50px rgba(103,232,208,.08)' } } },
  plugins: [],
};
