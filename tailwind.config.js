/** @type {import('tailwindcss').Config} */
// Paleta "oficina de inox": aço escovado no fundo, grafite no menu e as cores
// de têmpera da solda (palha, roxo, azul) marcando os estágios da produção.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper:  '#ECEEF0',
        card:   '#FFFFFF',
        ink:    '#14171B',
        body:   '#2C3138',
        muted:  '#59616C',
        faint:  '#8C939E',
        hair:   '#DADEE3',
        grafite: { DEFAULT: '#1B2026', 2: '#252B33', 3: '#343C46', texto: '#A9B1BC' },
        indigo: { DEFAULT: '#2D5BA8', tint: '#E8EEF8' },
        ok:     { DEFAULT: '#1E7A4C', tint: '#E4F3EA' },
        warn:   { DEFAULT: '#A1471F', tint: '#F8EAE2' },
        palha:  { DEFAULT: '#9C6B12', tint: '#F6EDD8' },
        tempera:{ DEFAULT: '#6A4C9C', tint: '#EFEAF7' },
        aco:    { DEFAULT: '#66707C', tint: '#EEF0F2' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { DEFAULT: '2px', md: '6px', lg: '8px' },
    },
  },
  plugins: [],
}
