// ── Theme definitions ──────────────────────────────────────────────────────
export const THEMES = [
  {
    id:    'violet',
    label: 'Violeta',
    hex:   '#7c6af7',
    rgb:       '124 106 247',
    hoverRgb:  '144 131 248',
  },
  {
    id:    'blue',
    label: 'Azul',
    hex:   '#3b82f6',
    rgb:       '59 130 246',
    hoverRgb:  '96 165 250',
  },
  {
    id:    'green',
    label: 'Verde',
    hex:   '#22c55e',
    rgb:       '34 197 94',
    hoverRgb:  '74 222 128',
  },
]

// ── Apply accent theme to :root CSS vars ──────────────────────────────────
export function applyTheme(id) {
  const t = THEMES.find(t => t.id === id) ?? THEMES[0]
  const root = document.documentElement
  root.style.setProperty('--accent-rgb',       t.rgb)
  root.style.setProperty('--accent-hover-rgb', t.hoverRgb)
  localStorage.setItem('theme', t.id)
}

// ── Apply dark / light color mode ─────────────────────────────────────────
export function applyMode(mode) {
  const html = document.documentElement
  if (mode === 'light') {
    html.classList.remove('dark')
  } else {
    html.classList.add('dark')
  }
  localStorage.setItem('colorMode', mode)
}

// ── Load persisted theme + mode on startup ────────────────────────────────
export function initTheme() {
  const savedTheme = localStorage.getItem('theme')     ?? 'violet'
  const savedMode  = localStorage.getItem('colorMode') ?? 'dark'
  applyTheme(savedTheme)
  applyMode(savedMode)
  return savedTheme
}
