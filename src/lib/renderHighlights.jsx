/**
 * Renderiza um texto com trechos destacados em amarelo.
 *
 * @param {string}   text       - Texto completo (ex: enunciado da questão)
 * @param {string[]} highlights - Array de strings que devem ser destacadas
 * @returns {React.ReactNode}
 */
export function renderWithHighlights(text, highlights) {
  if (!text) return null
  if (!highlights.length) return text

  // Constrói lista de segmentos {text, highlighted}
  let segments = [{ text, highlighted: false }]

  for (const h of highlights) {
    if (!h) continue
    const next = []
    for (const seg of segments) {
      if (seg.highlighted) { next.push(seg); continue }
      let remaining = seg.text
      while (remaining.length > 0) {
        const idx = remaining.indexOf(h)
        if (idx === -1) { next.push({ text: remaining, highlighted: false }); break }
        if (idx > 0) next.push({ text: remaining.slice(0, idx), highlighted: false })
        next.push({ text: h, highlighted: true })
        remaining = remaining.slice(idx + h.length)
      }
    }
    segments = next
  }

  return segments.map((s, i) =>
    s.highlighted
      ? (
        <mark
          key={i}
          style={{
            background: 'rgba(250, 204, 21, 0.38)',
            borderRadius: '2px',
            padding: '1px 0',
            // Funciona em dark mode: amarelo translúcido fica legível sobre fundo escuro
          }}
        >
          {s.text}
        </mark>
      )
      : <span key={i}>{s.text}</span>
  )
}
