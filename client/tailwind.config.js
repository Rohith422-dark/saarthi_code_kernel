/** Design tokens live in src/index.css as CSS variables; Tailwind just points at them. */
const c = (v) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: c('--canvas'),
        surface: c('--surface'),
        neutral: c('--neutral'),
        line: c('--line'),
        ink: c('--ink'),
        slate: c('--slate'),
        faint: c('--faint'),
        primary: { DEFAULT: c('--primary'), hover: c('--primary-hover'), subtle: c('--primary-subtle'), tint: c('--primary-tint') },
        success: { DEFAULT: c('--success'), surface: c('--success-surface') },
        warning: { DEFAULT: c('--warning'), surface: c('--warning-surface') },
        critical: { DEFAULT: c('--critical'), surface: c('--critical-surface') },
        info: { DEFAULT: c('--info') },
        ext: { DEFAULT: c('--ext-surface'), line: c('--ext-line') },
        track: c('--track'),
        skel: c('--skeleton'),
      },
      fontFamily: {
        sans: ['Inter', '"Noto Sans Devanagari"', '"Noto Sans Telugu"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { card: '12px', field: '9px' },
      width: { sidebar: '248px', 'sidebar-sm': '72px' },
      height: { nav: '64px' },
      boxShadow: {
        pop: '0 8px 24px -6px rgba(23,45,59,.14), 0 2px 6px rgba(23,45,59,.06)',
        dialog: '0 20px 48px -12px rgba(23,45,59,.22), 0 4px 12px rgba(23,45,59,.08)',
      },
      keyframes: { shimmer: { '100%': { transform: 'translateX(100%)' } } },
      animation: { shimmer: 'shimmer 1.4s infinite' },
    },
  },
  plugins: [],
};
