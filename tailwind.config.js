/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper:  '#F4F5F3',
        card:   '#FFFFFF',
        ink:    '#0B0D14',
        body:   '#2E323C',
        muted:  '#5A616E',
        faint:  '#9AA0AC',
        hair:   '#E3E5EA',
        indigo: { DEFAULT: '#4F5EE8', tint: '#EEF0FE' },
        ok:     { DEFAULT: '#1F7A4D', tint: '#E8F5EE' },
        warn:   { DEFAULT: '#8A4B2A', tint: '#F7EDE5' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { DEFAULT: '2px', lg: '8px' },
    },
  },
  plugins: [],
}
