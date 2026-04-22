import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Focus, PanelLeftClose, PanelLeftOpen, ChevronLeft, ChevronRight,
  Filter, Loader2, BookOpen, SearchX, ClipboardList,
} from 'lucide-react'
import QuestionFilters from '../components/QuestionFilters'
import QuestionCard    from '../components/QuestionCard'
import ExamMode        from '../components/ExamMode'
import { fetchQuestions as fetchQuestionsFromSupabase } from '../lib/questionsClient'

const EMPTY_FILTERS = {
  subject_area: '', vestibular: '', year: '', topic: '',
  onlyImages: false, onlyWrong: false, onlyFavorites: false,
}

/* ── Skeleton Card ── */
function SkeletonCard() {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3">
        <div className="skeleton h-5 w-16" />
        <div className="skeleton h-5 w-24" />
        <div className="skeleton h-5 w-20 ml-auto" />
      </div>
      <div className="space-y-2.5">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-4/6" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="skeleton h-11 w-full rounded-xl" />
        <div className="skeleton h-11 w-full rounded-xl" />
        <div className="skeleton h-11 w-full rounded-xl" />
      </div>
    </div>
  )
}

/* ── Pagination ── */
function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return null
  const nums = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 2) nums.push(i)
    else if (nums[nums.length - 1] !== '…') nums.push('…')
  }
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="btn-ghost px-2.5 py-2.5 disabled:opacity-20 rounded-xl"
      >
        <ChevronLeft size={16} />
      </button>

      {nums.map((n, i) =>
        n === '…'
          ? <span key={`e${i}`} className="px-1.5 text-ink-4 text-sm select-none">…</span>
          : <button
              key={n}
              onClick={() => onPage(n)}
              className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all duration-200 ${
                n === page
                  ? 'text-white'
                  : 'text-ink-3 hover:text-ink hover:bg-white/[0.05]'
              }`}
              style={n === page ? {
                background: 'linear-gradient(135deg, rgb(var(--accent-rgb)), rgb(var(--accent-rgb) / 0.8))',
                boxShadow: '0 2px 12px rgb(var(--accent-rgb) / 0.3)',
              } : undefined}
            >
              {n}
            </button>
      )}

      <button
        onClick={() => onPage(page + 1)}
        disabled={page === pages}
        className="btn-ghost px-2.5 py-2.5 disabled:opacity-20 rounded-xl"
      >
        <ChevronRight size={16} />
      </button>

      <span className="text-[11px] text-ink-4 ml-3 font-medium tabular-nums">
        {total.toLocaleString('pt-BR')} questões
      </span>
    </div>
  )
}

/* ── Main ── */
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
      const data = await fetchQuestionsFromSupabase({
        subject_area:  f.subject_area,
        vestibular:    f.vestibular,
        year:          f.year,
        topic:         f.topic,
        onlyImages:    f.onlyImages,
        onlyWrong:     f.onlyWrong,
        onlyFavorites: f.onlyFavorites,
        page: p,
        limit: 10,
      })
      setQuestions(data.data ?? [])
      setTotal(data.count ?? 0)
      setPages(data.pages ?? 1)
    } catch (err) {
      console.error('[Questoes] fetchQuestions error:', err)
      setQuestions([])
      setFetchError(err?.message ?? 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce topic filter
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

  function handleFilterChange(f) { setPendingFilters(f) }
  function handleReset() { setPendingFilters(EMPTY_FILTERS) }
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
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1">
          <h1 className="font-heading text-3xl font-bold text-ink tracking-tight">
            Banco de Questões
          </h1>
          <p className="text-[13px] text-ink-3 mt-1">
            {loading
              ? 'Carregando...'
              : fetchError
                ? `Erro: ${fetchError}`
                : (
                    <span className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-ink-2 font-medium">
                        {total.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-ink-4">questões disponíveis</span>
                    </span>
                  )
            }
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle sidebar */}
          {!focusMode && (
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className={`btn-ghost relative rounded-xl ${activeFilterCount > 0 ? 'text-accent' : ''}`}
              title={sidebarOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
            >
              {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
              <Filter size={17} />
              {activeFilterCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full text-white text-[9px] flex items-center justify-center font-bold"
                  style={{
                    background: 'linear-gradient(135deg, rgb(var(--accent-rgb)), rgb(var(--accent-rgb) / 0.8))',
                    boxShadow: '0 2px 8px rgb(var(--accent-rgb) / 0.4)',
                  }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {/* Focus mode */}
          <button
            onClick={() => { setFocusMode(v => !v); if (!focusMode) setSidebarOpen(false) }}
            className={`btn-ghost gap-2 rounded-xl text-[13px] ${
              focusMode ? 'text-accent' : ''
            }`}
            style={focusMode ? {
              background: 'rgb(var(--accent-rgb) / 0.1)',
              border: '1px solid rgb(var(--accent-rgb) / 0.2)',
            } : undefined}
            title={focusMode ? 'Sair do modo foco' : 'Modo foco'}
          >
            <Focus size={17} />
            {focusMode ? 'Sair do foco' : 'Modo foco'}
          </button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex gap-7">
        {/* Filter sidebar */}
        {!focusMode && sidebarOpen && (
          <aside className="w-[272px] shrink-0 animate-slide-in-right">
            <div className="card sticky top-4">
              <div className="flex items-center gap-2.5 mb-5">
                <Filter size={15} className="text-ink-3" />
                <h2 className="font-heading text-sm font-bold text-ink tracking-tight">Filtros</h2>
                {activeFilterCount > 0 && (
                  <span
                    className="ml-auto badge text-accent text-[11px]"
                    style={{ background: 'rgb(var(--accent-rgb) / 0.1)' }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <QuestionFilters
                filters={pendingFilters}
                onChange={handleFilterChange}
                onReset={handleReset}
              />

              {/* Gerar Teste */}
              <div className="px-1 pb-1 pt-3">
                <button
                  onClick={() => setExamOpen(true)}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl
                    text-white font-bold text-sm transition-all duration-300 group"
                  style={{
                    background: 'linear-gradient(135deg, rgb(var(--accent-rgb)), rgb(var(--accent-rgb) / 0.75))',
                    boxShadow: '0 4px 20px -2px rgb(var(--accent-rgb) / 0.3)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = '0 6px 28px -2px rgb(var(--accent-rgb) / 0.45)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = '0 4px 20px -2px rgb(var(--accent-rgb) / 0.3)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <ClipboardList size={16} />
                  Gerar Teste
                </button>
                <p className="text-[10px] text-ink-4 text-center mt-2.5">
                  Simulado com os filtros ativos
                </p>
              </div>
            </div>
          </aside>
        )}

        {/* Question list */}
        <div className="flex-1 min-w-0">
          {loading ? (
            /* Skeleton loading */
            <div className="space-y-5 animate-fade-in">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : fetchError ? (
            /* Error state */
            <div className="flex flex-col items-center justify-center py-28 gap-5 animate-fade-in">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgb(239 68 68 / 0.1)',
                  border: '1px solid rgb(239 68 68 / 0.15)',
                }}
              >
                <SearchX size={26} className="text-error" />
              </div>
              <div className="text-center">
                <p className="font-heading text-base font-bold text-ink">Não foi possível carregar as questões</p>
                <p className="text-xs text-ink-3 mt-1.5 max-w-xs">
                  Verifique sua conexão e tente novamente.
                </p>
                <p className="text-[11px] text-error/70 mt-1 font-mono">{fetchError}</p>
                <button
                  onClick={() => fetchQuestions(filters, page)}
                  className="mt-4 text-[13px] text-accent hover:text-accent-hover transition-colors duration-200 font-medium"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          ) : questions.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-28 gap-5 animate-fade-in">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgb(var(--s3))',
                  border: '1px solid rgb(255 255 255 / 0.06)',
                }}
              >
                <SearchX size={26} className="text-ink-4" />
              </div>
              <div className="text-center">
                <p className="font-heading text-base font-bold text-ink">Nenhuma questão encontrada</p>
                <p className="text-[13px] text-ink-3 mt-1.5">Ajuste os filtros ou limpe a busca</p>
              </div>
              <button onClick={handleReset} className="btn-secondary text-sm">
                Limpar filtros
              </button>
            </div>
          ) : (
            <>
              {/* Focus mode filter summary */}
              {focusMode && activeFilterCount > 0 && (
                <div
                  className="flex items-center gap-2.5 mb-5 p-3.5 rounded-xl text-[12px] text-ink-3 animate-fade-in"
                  style={{
                    background: 'rgb(var(--s2) / 0.7)',
                    border: '1px solid rgb(255 255 255 / 0.06)',
                  }}
                >
                  <Filter size={13} />
                  <span className="font-medium">{activeFilterCount} filtro(s) ativo(s)</span>
                  <button
                    onClick={() => setFocusMode(false)}
                    className="ml-auto text-accent hover:text-accent-hover font-medium transition-colors duration-200"
                  >
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

    {/* Exam Mode overlay */}
    {examOpen && (
      <ExamMode
        filters={filters}
        onClose={() => setExamOpen(false)}
      />
    )}
    </>
  )
}
