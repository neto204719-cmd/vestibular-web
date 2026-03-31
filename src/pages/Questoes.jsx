import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Focus, PanelLeftClose, PanelLeftOpen, ChevronLeft, ChevronRight,
  Filter, Loader2, BookOpen, SearchX, ClipboardList,
} from 'lucide-react'
import QuestionFilters from '../components/QuestionFilters'
import QuestionCard    from '../components/QuestionCard'
import ExamMode        from '../components/ExamMode'
import { api } from '../lib/api'

const EMPTY_FILTERS = {
  subject_area: '', vestibular: '', year: '', topic: '',
  onlyImages: false, onlyWrong: false, onlyFavorites: false,
}

function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return null
  const nums = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 2) nums.push(i)
    else if (nums[nums.length - 1] !== '…') nums.push('…')
  }
  return (
    <div className="flex items-center justify-center gap-1.5 py-6">
      <button onClick={() => onPage(page - 1)} disabled={page === 1}
        className="btn-ghost px-2 py-2 disabled:opacity-30"><ChevronLeft size={16} /></button>

      {nums.map((n, i) =>
        n === '…'
          ? <span key={`e${i}`} className="px-1 text-ink-4 text-sm">…</span>
          : <button key={n} onClick={() => onPage(n)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-all
                ${n === page ? 'bg-accent text-white' : 'text-ink-2 hover:bg-surface-3 hover:text-ink'}`}>
              {n}
            </button>
      )}

      <button onClick={() => onPage(page + 1)} disabled={page === pages}
        className="btn-ghost px-2 py-2 disabled:opacity-30"><ChevronRight size={16} /></button>

      <span className="text-xs text-ink-4 ml-2">{total} questões</span>
    </div>
  )
}

export default function Questoes() {
  const [filters,       setFilters]       = useState(EMPTY_FILTERS)
  const [pendingFilters,setPendingFilters] = useState(EMPTY_FILTERS)
  const [questions,     setQuestions]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [page,          setPage]          = useState(1)
  const [total,         setTotal]         = useState(0)
  const [pages,         setPages]         = useState(1)
  const [focusMode,     setFocusMode]     = useState(false)
  const [sidebarOpen,   setSidebarOpen]   = useState(true)
  const [fetchError,    setFetchError]    = useState(null)
  const [examOpen,      setExamOpen]      = useState(false)
  const debounceRef = useRef(null)
  const topRef      = useRef(null)

  const fetchQuestions = useCallback(async (f, p) => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ page: p, limit: 10 })
      if (f.subject_area)   params.set('subject_area',   f.subject_area)
      if (f.vestibular)     params.set('vestibular',     f.vestibular)
      if (f.year)           params.set('year',           f.year)
      if (f.topic)          params.set('topic',          f.topic)
      if (f.onlyImages)     params.set('onlyImages',     'true')
      if (f.onlyWrong)      params.set('onlyWrong',      'true')
      if (f.onlyFavorites)  params.set('onlyFavorites',  'true')

      const data = await api.get(`/api/questions?${params}`)

      setQuestions(data.data ?? [])
      setTotal(data.count ?? 0)
      setPages(data.pages ?? 1)
    } catch (err) {
      setQuestions([])
      setFetchError(err?.message ?? 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  // Aplica filtros com debounce no campo topic (texto livre)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters(pendingFilters)
      setPage(1)
    }, pendingFilters.topic !== filters.topic ? 500 : 0)
    return () => clearTimeout(debounceRef.current)
  }, [pendingFilters])

  useEffect(() => {
    fetchQuestions(filters, page)
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filters, page, fetchQuestions])

  function handleFilterChange(f) {
    setPendingFilters(f)
  }
  function handleReset() {
    setPendingFilters(EMPTY_FILTERS)
  }
  function handlePage(p) {
    if (p < 1 || p > pages) return
    setPage(p)
  }

  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    k !== 'onlyFavorites' && k !== 'onlyWrong' ? !!v : v
  ).length

  return (
    <>
    <div ref={topRef} className="animate-fade-in">
      {/* ── Topbar ── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Banco de Questões</h1>
          <p className="text-sm text-ink-3 mt-0.5">
            {loading ? 'Carregando...' : fetchError ? `Erro: ${fetchError}` : `${total.toLocaleString('pt-BR')} questões disponíveis`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle sidebar (fora do modo foco) */}
          {!focusMode && (
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className={`btn-ghost relative ${activeFilterCount > 0 ? 'text-accent' : ''}`}
              title={sidebarOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
            >
              {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
              <Filter size={17} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {/* Modo foco */}
          <button
            onClick={() => { setFocusMode(v => !v); if (!focusMode) setSidebarOpen(false) }}
            className={`btn-ghost gap-2 ${focusMode ? 'bg-accent/15 text-accent border border-accent/30' : ''}`}
            title={focusMode ? 'Sair do modo foco' : 'Modo foco'}
          >
            <Focus size={17} />
            {focusMode ? 'Sair do foco' : 'Modo foco'}
          </button>
        </div>
      </div>

      {/* ── Layout principal ── */}
      <div className={`flex gap-6 ${focusMode ? '' : ''}`}>
        {/* Sidebar de filtros */}
        {!focusMode && sidebarOpen && (
          <aside className="w-64 shrink-0 animate-slide-up">
            <div className="card sticky top-4">
              <div className="flex items-center gap-2 mb-4">
                <Filter size={15} className="text-ink-3" />
                <h2 className="text-sm font-semibold text-ink">Filtros</h2>
                {activeFilterCount > 0 && (
                  <span className="ml-auto badge bg-accent/10 text-accent">{activeFilterCount}</span>
                )}
              </div>
              <QuestionFilters
                filters={pendingFilters}
                onChange={handleFilterChange}
                onReset={handleReset}
              />

              {/* ── Gerar Teste ── */}
              <div className="px-4 pb-5 pt-2">
                <button
                  onClick={() => setExamOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                    bg-gradient-to-r from-accent to-violet-500 hover:from-accent/90 hover:to-violet-500/90
                    text-white font-semibold text-sm transition-all shadow-lg shadow-accent/20
                    hover:shadow-accent/30 hover:scale-[1.02] active:scale-100">
                  <ClipboardList size={16} />
                  Gerar Teste
                </button>
                <p className="text-[10px] text-ink-4 text-center mt-2">
                  Simulado com os filtros ativos
                </p>
              </div>
            </div>
          </aside>
        )}

        {/* Lista de questões */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-ink-3">
              <Loader2 size={28} className="animate-spin text-accent" />
              <p className="text-sm">Carregando questões...</p>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center">
                <SearchX size={28} className="text-error" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-ink">Erro ao carregar questões</p>
                <p className="text-xs text-error mt-1 font-mono">{fetchError}</p>
                <button onClick={() => fetchQuestions(filters, page)}
                  className="mt-3 text-xs text-accent hover:underline">Tentar novamente</button>
              </div>
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-surface-3 flex items-center justify-center">
                <SearchX size={28} className="text-ink-4" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-ink">Nenhuma questão encontrada</p>
                <p className="text-xs text-ink-3 mt-1">Tente ajustar os filtros ou limpar a busca</p>
              </div>
              <button onClick={handleReset} className="btn-secondary text-sm">
                Limpar filtros
              </button>
            </div>
          ) : (
            <>
              {/* Resumo dos filtros ativos (modo foco) */}
              {focusMode && activeFilterCount > 0 && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-surface-2 border border-surface-4/60 rounded-xl text-xs text-ink-3">
                  <Filter size={13} />
                  <span>{activeFilterCount} filtro(s) ativo(s)</span>
                  <button onClick={() => setFocusMode(false)} className="ml-auto text-accent hover:underline">
                    Editar
                  </button>
                </div>
              )}

              <div className="space-y-5">
                {questions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={(page - 1) * 10 + i + 1}
                  />
                ))}
              </div>

              <Pagination page={page} pages={pages} total={total} onPage={handlePage} />
            </>
          )}
        </div>
      </div>
    </div>

    {/* ── Exam Mode overlay ── */}
    {examOpen && (
      <ExamMode
        filters={filters}
        onClose={() => setExamOpen(false)}
      />
    )}
    </>
  )
}
