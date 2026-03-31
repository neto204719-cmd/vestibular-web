import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Flag, ChevronLeft, ChevronRight, Trophy, Clock,
  RotateCcw, CheckCircle, XCircle, Minus, BookOpen,
  AlertTriangle, Loader2, Construction,
} from 'lucide-react'
import { api } from '../lib/api'

// ─── helpers ──────────────────────────────────────────────────────────────────

const QUANTITIES = [10, 15, 20, 30, 40, 60]

function formatTime(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}
function pad(n) { return String(n).padStart(2, '0') }

function filterLabel(filters) {
  const parts = []
  if (filters.subject_area) parts.push(filters.subject_area)
  if (filters.vestibular)   parts.push(filters.vestibular)
  if (filters.year)         parts.push(filters.year)
  if (filters.topic)        parts.push(`"${filters.topic}"`)
  return parts.length ? parts.join(' · ') : 'Todos os temas'
}

// ─── sub-components ───────────────────────────────────────────────────────────

function OptionButton({ letter, text, state, onClick, disabled }) {
  const base = 'flex items-start gap-4 w-full text-left px-5 py-4 rounded-xl border transition-all duration-150 group'
  const styles = {
    idle:             'border-surface-4 bg-surface-2 hover:border-accent/50 hover:bg-surface-3 cursor-pointer',
    selected:         'border-accent bg-accent/10 cursor-pointer',
    correct:          'border-emerald-500 bg-emerald-500/10 cursor-default',
    wrong:            'border-rose-500 bg-rose-500/10 cursor-default',
    'reveal-correct': 'border-emerald-500/60 bg-emerald-500/5 cursor-default',
  }
  const letterStyles = {
    idle:             'border border-surface-4 text-ink-3 group-hover:border-accent/60 group-hover:text-accent',
    selected:         'bg-accent border-accent text-white',
    correct:          'bg-emerald-500 border-emerald-500 text-white',
    wrong:            'bg-rose-500 border-rose-500 text-white',
    'reveal-correct': 'border-emerald-500/60 text-emerald-400',
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} ${styles[state] ?? styles.idle}`}>
      <span className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${letterStyles[state] ?? letterStyles.idle}`}>
        {letter}
      </span>
      <span className={`text-base leading-relaxed pt-0.5 ${
        state === 'correct'  ? 'text-emerald-300' :
        state === 'wrong'    ? 'text-rose-300' :
        state === 'selected' ? 'text-ink' : 'text-ink-2'
      }`}>{text}</span>
    </button>
  )
}

function QuestionSidebarBtn({ num, status, current, onClick }) {
  const base = 'w-9 h-9 rounded-lg text-xs font-semibold transition-all flex items-center justify-center relative'
  const styles = {
    unanswered:         'bg-surface-3 text-ink-3 hover:bg-surface-4 hover:text-ink',
    answered:           'bg-accent/80 text-white hover:bg-accent',
    flagged:            'bg-amber-500/80 text-white hover:bg-amber-500',
    'answered-flagged': 'bg-accent/80 text-white hover:bg-accent',
  }
  const ring = current ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-1' : ''
  return (
    <button onClick={onClick} className={`${base} ${styles[status] ?? styles.unanswered} ${ring}`}>
      {num}
      {(status === 'answered-flagged') && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border border-surface-1" />
      )}
    </button>
  )
}

// ─── Resolution panel ─────────────────────────────────────────────────────────

function ResolutionPanel({ q, userAnswer, isReview }) {
  const isCorrect = userAnswer && userAnswer === q.correct_letter

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-surface-3 flex-shrink-0">
        <p className="text-xs font-semibold text-ink-4 uppercase tracking-wider">Resolução</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Result badge */}
        {userAnswer ? (
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold ${
            isCorrect
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}>
            {isCorrect
              ? <><CheckCircle size={16} /> Resposta correta!</>
              : <><XCircle size={16} /> Resposta incorreta</>
            }
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm bg-surface-3 border border-surface-4 text-ink-4">
            <Minus size={16} /> Questão não respondida
          </div>
        )}

        {/* Correct answer */}
        <div className="p-4 rounded-xl bg-surface-2 border border-surface-3">
          <p className="text-xs text-ink-4 mb-2">Gabarito oficial</p>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-lg font-bold text-emerald-400">
              {q.correct_letter}
            </span>
            <span className="text-sm text-ink-2 leading-relaxed">
              {q.options?.find(o => o.letter === q.correct_letter)?.text ?? ''}
            </span>
          </div>
        </div>

        {/* Wrong answer shown */}
        {userAnswer && !isCorrect && (
          <div className="p-4 rounded-xl bg-surface-2 border border-surface-3">
            <p className="text-xs text-ink-4 mb-2">Sua resposta</p>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-lg font-bold text-rose-400">
                {userAnswer}
              </span>
              <span className="text-sm text-ink-2 leading-relaxed">
                {q.options?.find(o => o.letter === userAnswer)?.text ?? ''}
              </span>
            </div>
          </div>
        )}

        {/* Resolution placeholder */}
        <div className="p-5 rounded-xl bg-surface-2 border border-surface-3 border-dashed flex flex-col items-center gap-3 text-center py-8">
          <span className="text-3xl">🚧</span>
          <div>
            <p className="text-sm font-medium text-ink-2">Resolução em construção</p>
            <p className="text-xs text-ink-4 mt-1">Em breve você terá acesso à resolução detalhada desta questão.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Config phase ─────────────────────────────────────────────────────────────

function ConfigPhase({ filters, quantity, setQuantity, onStart, onClose, error, loading }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-surface-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Configurar Simulado</h2>
            <p className="text-xs text-ink-3 mt-0.5">{filterLabel(filters)}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Quantity */}
        <div className="px-6 py-5">
          <p className="text-sm font-medium text-ink-2 mb-3">Quantidade de questões</p>
          <div className="grid grid-cols-3 gap-2">
            {QUANTITIES.map(q => (
              <button key={q} onClick={() => setQuantity(q)}
                className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                  quantity === q
                    ? 'bg-accent border-accent text-white'
                    : 'border-surface-4 bg-surface-2 text-ink-2 hover:border-accent/50 hover:text-ink'
                }`}>
                {q} questões
              </button>
            ))}
          </div>

          {/* Filters summary */}
          <div className="mt-5 p-3.5 rounded-xl bg-surface-2 border border-surface-3">
            <p className="text-xs text-ink-4 uppercase tracking-wider mb-2">Filtros ativos</p>
            {[
              ['Matéria', filters.subject_area],
              ['Vestibular', filters.vestibular],
              ['Ano', filters.year],
              ['Assunto', filters.topic],
            ].map(([label, val]) => val ? (
              <div key={label} className="flex items-center gap-2 text-xs py-0.5">
                <span className="text-ink-4 w-16">{label}</span>
                <span className="text-ink-2 font-medium">{val}</span>
              </div>
            ) : null)}
            {!filters.subject_area && !filters.vestibular && !filters.year && !filters.topic && (
              <p className="text-xs text-ink-4">Nenhum filtro selecionado — questões aleatórias de todos os temas.</p>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <AlertTriangle size={14} className="text-rose-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-rose-300">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6">
          <button onClick={onStart} disabled={loading}
            className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Carregando questões...</> : 'Iniciar Simulado'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Results phase ────────────────────────────────────────────────────────────

function ResultsPhase({ questions, answers, elapsed, onReview, onRetry, onClose }) {
  const correct = questions.filter(q => answers[q.id] === q.correct_letter).length
  const wrong   = questions.filter(q => answers[q.id] && answers[q.id] !== q.correct_letter).length
  const skipped = questions.filter(q => !answers[q.id]).length
  const pct     = Math.round((correct / questions.length) * 100)

  const getResultStatus = (q) => {
    if (!answers[q.id]) return 'skipped'
    return answers[q.id] === q.correct_letter ? 'correct' : 'wrong'
  }

  const gradeColor =
    pct >= 70 ? 'text-emerald-400' :
    pct >= 50 ? 'text-amber-400'   : 'text-rose-400'
  const gradeMsg =
    pct >= 85 ? 'Excelente! 🏆' :
    pct >= 70 ? 'Muito bem! 👏' :
    pct >= 50 ? 'Continue praticando 💪' : 'Boa tentativa, continue estudando 📚'

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0e11] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-surface-3 bg-surface-1">
        <div className="flex items-center gap-3">
          <Trophy size={20} className="text-accent" />
          <span className="font-bold text-ink">Resultado do Simulado</span>
        </div>
        <button onClick={onClose} className="btn-ghost p-2 rounded-lg text-ink-3">
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10">
          {/* Score */}
          <div className="text-center mb-10">
            <div className={`text-7xl font-black mb-1 ${gradeColor}`}>{pct}%</div>
            <div className="text-2xl font-bold text-ink mb-2">
              {correct} <span className="text-ink-3 font-normal">de</span> {questions.length}
            </div>
            <p className="text-ink-3 text-sm">{gradeMsg}</p>

            {/* Progress bar */}
            <div className="mt-5 h-3 bg-surface-3 rounded-full overflow-hidden max-w-xs mx-auto">
              <div className="h-full bg-gradient-to-r from-accent to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3 mb-10">
            {[
              { label: 'Corretas',   value: correct,          icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Incorretas', value: wrong,            icon: XCircle,     color: 'text-rose-400',    bg: 'bg-rose-500/10'    },
              { label: 'Em branco',  value: skipped,          icon: Minus,       color: 'text-ink-4',       bg: 'bg-surface-3'      },
              { label: 'Tempo',      value: formatTime(elapsed), icon: Clock,    color: 'text-accent',      bg: 'bg-accent/10'      },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-4 flex flex-col items-center gap-1.5`}>
                <Icon size={18} className={color} />
                <span className={`text-xl font-bold ${color}`}>{value}</span>
                <span className="text-xs text-ink-4">{label}</span>
              </div>
            ))}
          </div>

          {/* Question grid */}
          <div className="mb-8">
            <p className="text-xs font-medium text-ink-4 uppercase tracking-wider mb-3">Gabarito resumido</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, i) => {
                const status = getResultStatus(q)
                const colors = {
                  correct: 'bg-emerald-500/80 text-white',
                  wrong:   'bg-rose-500/80 text-white',
                  skipped: 'bg-surface-3 text-ink-4',
                }
                return (
                  <button key={q.id} onClick={() => onReview(i)}
                    title={status === 'correct' ? 'Correta' : status === 'wrong' ? 'Incorreta' : 'Em branco'}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-all hover:scale-110 hover:shadow-lg ${colors[status]}`}>
                    {i + 1}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3">
              {[['bg-emerald-500/80', 'Correta'], ['bg-rose-500/80', 'Incorreta'], ['bg-surface-3', 'Em branco']].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${c}`} />
                  <span className="text-xs text-ink-4">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => onReview(0)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold text-sm transition-all">
              <BookOpen size={16} /> Revisar Gabarito
            </button>
            <button onClick={onRetry}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-surface-4 bg-surface-2 hover:bg-surface-3 text-ink-2 font-semibold text-sm transition-all">
              <RotateCcw size={15} /> Novo Simulado
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ExamMode ────────────────────────────────────────────────────────────

export default function ExamMode({ filters, onClose }) {
  const [phase,      setPhase]      = useState('config')
  const [quantity,   setQuantity]   = useState(20)
  const [questions,  setQuestions]  = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers,    setAnswers]    = useState({})
  const [flagged,    setFlagged]    = useState(new Set())
  const [elapsed,    setElapsed]    = useState(0)
  const [loadingQ,   setLoadingQ]   = useState(false)
  const [error,      setError]      = useState(null)
  const timerRef = useRef(null)

  // ── Timer ──
  useEffect(() => {
    if (phase === 'exam') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [phase])

  // ── Fetch questions ──
  const startExam = useCallback(async () => {
    setLoadingQ(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: 1, limit: quantity })
      if (filters.subject_area) params.set('subject_area', filters.subject_area)
      if (filters.vestibular)   params.set('vestibular',   filters.vestibular)
      if (filters.year)         params.set('year',         filters.year)
      if (filters.topic)        params.set('topic',        filters.topic)
      const result = await api.get(`/api/questions?${params}`)
      if (!result.data?.length) {
        setError('Nenhuma questão encontrada com esses filtros. Ajuste e tente novamente.')
        setLoadingQ(false)
        return
      }
      const shuffled = [...result.data].sort(() => Math.random() - 0.5)
      setQuestions(shuffled.slice(0, quantity))
      setCurrentIdx(0)
      setAnswers({})
      setFlagged(new Set())
      setElapsed(0)
      setPhase('exam')
    } catch (err) {
      setError(err?.message ?? 'Erro ao carregar questões')
    } finally {
      setLoadingQ(false)
    }
  }, [filters, quantity])

  // ── Helpers ──
  const q = questions[currentIdx]

  const getStatus = useCallback((question) => {
    const hasAnswer = !!answers[question.id]
    const isFlagged = flagged.has(question.id)
    if (hasAnswer && isFlagged) return 'answered-flagged'
    if (hasAnswer)  return 'answered'
    if (isFlagged)  return 'flagged'
    return 'unanswered'
  }, [answers, flagged])

  const toggleFlag = useCallback((id) => {
    setFlagged(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const setAnswer = useCallback((id, letter) => {
    setAnswers(prev => ({ ...prev, [id]: letter }))
  }, [])

  const finishExam = useCallback(() => {
    clearInterval(timerRef.current)
    setPhase('results')
  }, [])

  const goReview = useCallback((idx) => {
    setCurrentIdx(idx)
    setPhase('review')
  }, [])

  // ── Config phase ──
  if (phase === 'config' || phase === 'loading') {
    return (
      <ConfigPhase
        filters={filters}
        quantity={quantity}
        setQuantity={setQuantity}
        onStart={startExam}
        onClose={onClose}
        error={error}
        loading={loadingQ}
      />
    )
  }

  // ── Results phase ──
  if (phase === 'results') {
    return (
      <ResultsPhase
        questions={questions}
        answers={answers}
        elapsed={elapsed}
        onReview={goReview}
        onRetry={() => { setPhase('config'); setError(null) }}
        onClose={onClose}
      />
    )
  }

  // ── Exam & Review phases ──
  const isReview   = phase === 'review'
  const userAnswer = answers[q?.id]
  const answered   = questions.filter(qq => !!answers[qq.id]).length
  const flagCount  = flagged.size

  // Show resolution panel when question is answered (exam) or always in review
  const showResolution = isReview || !!userAnswer

  const getOptionState = (letter) => {
    if (!isReview) {
      return userAnswer === letter ? 'selected' : 'idle'
    }
    if (letter === q.correct_letter) return 'correct'
    if (userAnswer === letter && userAnswer !== q.correct_letter) return 'wrong'
    return 'idle'
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0e11] flex flex-col" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-surface-3 bg-surface-1 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
            <BookOpen size={14} className="text-accent" />
          </div>
          <div>
            <span className="text-sm font-bold text-ink">
              {isReview ? 'Revisão do Gabarito' : 'Simulado'}
            </span>
            {filterLabel(filters) !== 'Todos os temas' && (
              <span className="ml-2 text-xs text-ink-4">{filterLabel(filters)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isReview && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-surface-3 text-sm font-mono ${
              elapsed > 3600 ? 'text-amber-400' : 'text-ink-2'
            }`}>
              <Clock size={13} />
              {formatTime(elapsed)}
            </div>
          )}

          <div className="text-xs text-ink-4 tabular-nums">
            {isReview
              ? `Questão ${currentIdx + 1} / ${questions.length}`
              : `${answered} / ${questions.length} respondidas`
            }
          </div>

          {!isReview && (
            <button onClick={finishExam}
              className="px-4 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 text-xs font-semibold transition-all">
              Finalizar
            </button>
          )}

          {isReview && (
            <button onClick={() => setPhase('results')}
              className="px-4 py-1.5 rounded-lg bg-surface-2 border border-surface-3 text-ink-2 hover:bg-surface-3 text-xs font-semibold transition-all">
              Ver Resultado
            </button>
          )}

          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-4 hover:text-ink hover:bg-surface-3 transition-all">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Sidebar (question navigator) ── */}
        <div className="w-[200px] flex-shrink-0 bg-surface-1 border-r border-surface-3 flex flex-col">
          <div className="px-3 pt-3 pb-2 border-b border-surface-3">
            <p className="text-[11px] text-ink-4 uppercase tracking-wider mb-1.5">Questões</p>
            {!isReview && (
              <div className="flex gap-2 text-xs text-ink-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-accent/70 inline-block" />{answered} resp.
                </span>
                {flagCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{flagCount}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2.5">
            <div className="grid grid-cols-4 gap-1.5">
              {questions.map((qq, i) => {
                let status
                if (isReview) {
                  if (!answers[qq.id]) status = 'skipped-review'
                  else status = answers[qq.id] === qq.correct_letter ? 'correct-review' : 'wrong-review'
                } else {
                  status = getStatus(qq)
                }

                let reviewStyle = ''
                if (isReview) {
                  reviewStyle = status === 'correct-review' ? 'bg-emerald-500/70 text-white hover:bg-emerald-500' :
                               status === 'wrong-review'   ? 'bg-rose-500/70 text-white hover:bg-rose-500' :
                               'bg-surface-3 text-ink-4 hover:bg-surface-4'
                }

                return isReview ? (
                  <button key={qq.id} onClick={() => setCurrentIdx(i)}
                    className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all flex items-center justify-center
                      ${reviewStyle}
                      ${i === currentIdx ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-1' : ''}`}>
                    {i + 1}
                  </button>
                ) : (
                  <QuestionSidebarBtn
                    key={qq.id}
                    num={i + 1}
                    status={status}
                    current={i === currentIdx}
                    onClick={() => setCurrentIdx(i)}
                  />
                )
              })}
            </div>
          </div>

          <div className="px-3 pb-3 pt-2 border-t border-surface-3 space-y-1.5">
            {!isReview ? [
              ['bg-surface-3',    'Não respondida'],
              ['bg-accent/80',    'Respondida'],
              ['bg-amber-500/80', 'Para revisar'],
            ].map(([c, l]) => (
              <div key={l} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${c} flex-shrink-0`} />
                <span className="text-[10px] text-ink-4">{l}</span>
              </div>
            )) : [
              ['bg-emerald-500/70', 'Correta'],
              ['bg-rose-500/70',    'Incorreta'],
              ['bg-surface-3',      'Em branco'],
            ].map(([c, l]) => (
              <div key={l} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${c} flex-shrink-0`} />
                <span className="text-[10px] text-ink-4">{l}</span>
              </div>
            ))}

            {!isReview && (
              <button onClick={finishExam}
                className="mt-1.5 w-full py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 text-xs font-semibold transition-all">
                Finalizar
              </button>
            )}
          </div>
        </div>

        {/* ── Question area + Resolution panel ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Main question area ── */}
          <div className="flex-1 overflow-y-auto">
            {q && (
              <div className="px-8 py-6">
                {/* Question header */}
                <div className="flex items-start justify-between mb-5 gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-ink-3">
                      Questão {currentIdx + 1} <span className="text-ink-4">de {questions.length}</span>
                    </span>
                    {q.subject_area && (
                      <span className="px-2 py-0.5 rounded-md bg-accent/15 text-accent text-xs font-medium">
                        {q.subject_area}
                      </span>
                    )}
                    {q.vestibular && (
                      <span className="px-2 py-0.5 rounded-md bg-surface-3 text-ink-3 text-xs">
                        {q.vestibular} {q.year}
                      </span>
                    )}
                    {q.topic && (
                      <span className="px-2 py-0.5 rounded-md bg-surface-3 text-ink-4 text-xs truncate max-w-[200px]" title={q.topic}>
                        {q.topic}
                      </span>
                    )}
                  </div>

                  {!isReview && (
                    <button onClick={() => toggleFlag(q.id)}
                      title={flagged.has(q.id) ? 'Remover marcação' : 'Marcar para revisar'}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        flagged.has(q.id)
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
                          : 'bg-surface-2 border-surface-4 text-ink-4 hover:border-amber-500/40 hover:text-amber-400'
                      }`}>
                      <Flag size={13} fill={flagged.has(q.id) ? 'currentColor' : 'none'} />
                      {flagged.has(q.id) ? 'Marcada' : 'Marcar'}
                    </button>
                  )}
                </div>

                {/* Image */}
                {q.image_url && (
                  <div className="mb-5 flex justify-center">
                    <img src={q.image_url} alt="Imagem da questão"
                      className="max-w-full max-h-72 rounded-xl border border-surface-3 object-contain" />
                  </div>
                )}

                {/* Statement */}
                <div className="text-ink mb-6 whitespace-pre-wrap leading-[1.85]" style={{ fontSize: '17px' }}>
                  {q.statement}
                </div>

                {/* Options */}
                <div className="space-y-3 mb-8">
                  {(q.options ?? [])
                    .sort((a, b) => a.letter.localeCompare(b.letter))
                    .map(opt => (
                      <OptionButton
                        key={opt.letter}
                        letter={opt.letter}
                        text={opt.text}
                        state={getOptionState(opt.letter)}
                        disabled={isReview || !!userAnswer}
                        onClick={() => !isReview && !userAnswer && setAnswer(q.id, opt.letter)}
                      />
                    ))
                  }
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-2 border-t border-surface-3/50">
                  <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                    disabled={currentIdx === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-surface-4 bg-surface-2 hover:bg-surface-3 text-ink-2 text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-default">
                    <ChevronLeft size={16} /> Anterior
                  </button>

                  <div className="flex items-center gap-1.5">
                    {questions.map((_, i) => (
                      <button key={i} onClick={() => setCurrentIdx(i)}
                        className={`transition-all rounded-full ${
                          i === currentIdx
                            ? 'w-5 h-2 bg-accent'
                            : 'w-2 h-2 bg-surface-4 hover:bg-surface-5'
                        }`} />
                    )).slice(
                      Math.max(0, currentIdx - 4),
                      Math.min(questions.length, currentIdx + 5)
                    )}
                  </div>

                  {currentIdx < questions.length - 1 ? (
                    <button onClick={() => setCurrentIdx(i => i + 1)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-all">
                      Próxima <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button onClick={isReview ? () => setPhase('results') : finishExam}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-all">
                      {isReview ? 'Ver Resultado' : 'Finalizar'} <CheckCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Resolution panel ── */}
          {showResolution && q && (
            <div className="w-[35%] min-w-[300px] max-w-[460px] flex-shrink-0 border-l border-surface-3 bg-surface-1 overflow-y-auto flex flex-col">
              <ResolutionPanel q={q} userAnswer={userAnswer} isReview={isReview} />
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
