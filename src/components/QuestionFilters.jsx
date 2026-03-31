import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, SlidersHorizontal, X, RotateCcw } from 'lucide-react'
import { api } from '../lib/api'

const VESTIBULARES = ['ENEM', 'FUVEST', 'UNICAMP']

function FilterSelect({ label, value, onChange, options, placeholder = 'Todos' }) {
  return (
    <div className="space-y-1.5">
      {label && <p className="label">{label}</p>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input py-2 text-sm appearance-none cursor-pointer"
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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/15 text-accent text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-error transition-colors"><X size={11} /></button>
    </span>
  )
}

export default function QuestionFilters({ filters, onChange, onReset }) {
  const [meta,        setMeta]        = useState({ areas: [], vestibulares: VESTIBULARES, years: [] })
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
    <div className="space-y-4">
      {/* ── Camada 1: sempre visível ── */}
      <div className="space-y-3">
        <FilterSelect
          label="Matéria"
          value={filters.subject_area}
          onChange={v => set('subject_area', v)}
          options={meta.areas}
        />
        <FilterSelect
          label="Vestibular"
          value={filters.vestibular}
          onChange={v => set('vestibular', v)}
          options={VESTIBULARES}
        />
      </div>

      {/* ── Camada 2: expansível ── */}
      <div className="border-t border-surface-4/60 pt-3">
        <button
          onClick={() => setLayer2Open(v => !v)}
          className="flex items-center justify-between w-full text-xs font-medium text-ink-3 hover:text-ink transition-colors py-1"
        >
          <span>Mais filtros</span>
          {layer2Open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {layer2Open && (
          <div className="mt-3 space-y-3 animate-slide-up">
            <FilterSelect
              label="Ano"
              value={filters.year}
              onChange={v => set('year', v)}
              options={(meta.years ?? []).map(y => ({ value: String(y), label: String(y) }))}
            />
            <div className="space-y-1.5">
              <p className="label">Assunto / Tópico</p>
              <input
                type="text"
                className="input py-2 text-sm"
                placeholder="Ex: cinemática, célula..."
                value={filters.topic}
                onChange={e => set('topic', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Camada 3: avançado ── */}
      <div className="border-t border-surface-4/60 pt-3">
        <button
          onClick={() => setLayer3Open(v => !v)}
          className="flex items-center justify-between w-full text-xs font-medium text-ink-3 hover:text-ink transition-colors py-1"
        >
          <span className="flex items-center gap-1.5"><SlidersHorizontal size={13} />Filtros avançados</span>
          {layer3Open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {layer3Open && (
          <div className="mt-3 space-y-2.5 animate-slide-up">
            {[
              { key: 'onlyImages',    label: '🖼  Com imagem'   },
              { key: 'onlyWrong',     label: '✗  Que já errei'  },
              { key: 'onlyFavorites', label: '★  Favoritas'     },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all
                  ${filters[key] ? 'bg-accent border-accent' : 'border-surface-5 group-hover:border-accent/50'}`}
                  onClick={() => set(key, !filters[key])}>
                  {filters[key] && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
                <span className="text-sm text-ink-2 group-hover:text-ink transition-colors">{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Chips dos filtros ativos */}
      {activeChips.length > 0 && (
        <div className="border-t border-surface-4/60 pt-3 space-y-2">
          <p className="label">Ativos</p>
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map(c => (
              <Chip
                key={c.key}
                label={c.label}
                onRemove={() => set(c.key, typeof filters[c.key] === 'boolean' ? false : '')}
              />
            ))}
          </div>
          <button onClick={onReset} className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-error transition-colors mt-1">
            <RotateCcw size={12} /> Limpar filtros
          </button>
        </div>
      )}
    </div>
  )
}
