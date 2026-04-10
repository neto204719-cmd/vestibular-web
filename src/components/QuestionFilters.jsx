import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, SlidersHorizontal, X, RotateCcw } from 'lucide-react'
import { api } from '../lib/api'

function FilterSelect({ label, value, onChange, options, placeholder = 'Todos' }) {
  return (
    <div className="space-y-2">
      {label && <p className="label">{label}</p>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input py-2.5 text-[13px] appearance-none cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  )
}

function Chip({ label, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-accent text-[11px] font-semibold transition-all duration-200 group"
      style={{
        background: 'rgb(var(--accent-rgb) / 0.1)',
        border: '1px solid rgb(var(--accent-rgb) / 0.15)',
      }}
    >
      {label}
      <button
        onClick={onRemove}
        className="text-accent/60 hover:text-error transition-colors duration-200"
      >
        <X size={11} />
      </button>
    </span>
  )
}

export default function QuestionFilters({ filters, onChange, onReset }) {
  const [meta,        setMeta]        = useState({ subject_areas: [], vestibulares: [], years: [] })
  const [layer2Open,  setLayer2Open]  = useState(false)
  const [layer3Open,  setLayer3Open]  = useState(false)

  useEffect(() => {
    api.get('/api/filters/metadata')
      .then(d => setMeta(d))
      .catch(() => {})
  }, [])

  // Chips dos filtros ativos
  const activeChips = []
  if (filters.subject_area) activeChips.push({ key: 'subject_area', label: filters.subject_area })
  if (filters.vestibular)   activeChips.push({ key: 'vestibular',   label: filters.vestibular })
  if (filters.year)         activeChips.push({ key: 'year',         label: `Ano ${filters.year}` })
  if (filters.topic)        activeChips.push({ key: 'topic',        label: filters.topic })
  if (filters.onlyImages)   activeChips.push({ key: 'onlyImages',   label: 'Com imagem' })
  if (filters.onlyWrong)    activeChips.push({ key: 'onlyWrong',    label: 'Erradas' })
  if (filters.onlyFavorites) activeChips.push({ key: 'onlyFavorites', label: 'Favoritas' })

  const set = (key, val) => onChange({ ...filters, [key]: val })

  return (
    <div className="space-y-5">
      {/* ── Layer 1: always visible ── */}
      <div className="space-y-4">
        <FilterSelect
          label="Matéria"
          value={filters.subject_area}
          onChange={v => set('subject_area', v)}
          options={meta.subject_areas ?? []}
        />
        <FilterSelect
          label="Vestibular"
          value={filters.vestibular}
          onChange={v => set('vestibular', v)}
          options={meta.vestibulares ?? []}
        />
      </div>

      {/* ── Layer 2: expandable ── */}
      <div className="pt-4" style={{ borderTop: '1px solid rgb(255 255 255 / 0.04)' }}>
        <button
          onClick={() => setLayer2Open(v => !v)}
          className="flex items-center justify-between w-full text-[12px] font-semibold text-ink-3 hover:text-ink-2 transition-colors duration-200 py-1"
        >
          <span>Mais filtros</span>
          {layer2Open
            ? <ChevronUp size={14} className="transition-transform duration-200" />
            : <ChevronDown size={14} className="transition-transform duration-200" />
          }
        </button>

        {layer2Open && (
          <div className="mt-4 space-y-4 animate-slide-up">
            <FilterSelect
              label="Ano"
              value={filters.year}
              onChange={v => set('year', v)}
              options={(meta.years ?? []).map(y => ({ value: String(y), label: String(y) }))}
            />
            <div className="space-y-2">
              <p className="label">Assunto / Tópico</p>
              <input
                type="text"
                className="input py-2.5 text-[13px]"
                placeholder="Ex: cinemática, célula..."
                value={filters.topic}
                onChange={e => set('topic', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Layer 3: advanced ── */}
      <div className="pt-4" style={{ borderTop: '1px solid rgb(255 255 255 / 0.04)' }}>
        <button
          onClick={() => setLayer3Open(v => !v)}
          className="flex items-center justify-between w-full text-[12px] font-semibold text-ink-3 hover:text-ink-2 transition-colors duration-200 py-1"
        >
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal size={13} />
            Filtros avançados
          </span>
          {layer3Open
            ? <ChevronUp size={14} className="transition-transform duration-200" />
            : <ChevronDown size={14} className="transition-transform duration-200" />
          }
        </button>

        {layer3Open && (
          <div className="mt-4 space-y-3 animate-slide-up">
            {[
              { key: 'onlyImages',    label: 'Com imagem'    },
              { key: 'onlyWrong',     label: 'Que já errei'  },
              { key: 'onlyFavorites', label: 'Favoritas'     },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group py-0.5">
                <div
                  className="w-[18px] h-[18px] rounded-md flex items-center justify-center transition-all duration-200"
                  style={filters[key] ? {
                    background: 'linear-gradient(135deg, rgb(var(--accent-rgb)), rgb(var(--accent-rgb) / 0.8))',
                    boxShadow: '0 2px 8px rgb(var(--accent-rgb) / 0.3)',
                  } : {
                    background: 'transparent',
                    border: '1.5px solid rgb(255 255 255 / 0.15)',
                  }}
                  onClick={() => set(key, !filters[key])}
                >
                  {filters[key] && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
                <span className="text-[13px] text-ink-2 group-hover:text-ink transition-colors duration-200">
                  {label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="pt-4 space-y-3" style={{ borderTop: '1px solid rgb(255 255 255 / 0.04)' }}>
          <p className="label">Ativos</p>
          <div className="flex flex-wrap gap-2">
            {activeChips.map(c => (
              <Chip
                key={c.key}
                label={c.label}
                onRemove={() => set(c.key, typeof filters[c.key] === 'boolean' ? false : '')}
              />
            ))}
          </div>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-error transition-colors duration-200 mt-1 font-medium"
          >
            <RotateCcw size={12} /> Limpar filtros
          </button>
        </div>
      )}
    </div>
  )
}
