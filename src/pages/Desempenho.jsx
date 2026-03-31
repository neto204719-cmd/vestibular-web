import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, BookOpen, Flame, Calendar, ChevronRight,
  ChevronLeft, RotateCcw, CheckCircle, XCircle, Loader2,
  ArrowLeft, BarChart2,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, Cell, ReferenceLine,
} from 'recharts'
import { api } from '../lib/api'

// ─── helpers ──────────────────────────────────────────────────────────────────

const PERIODS = [
  { value: '7d',  label: '7 dias'   },
  { value: '30d', label: '30 dias'  },
  { value: '90d', label: '90 dias'  },
  { value: 'all', label: 'Tudo'     },
]

const periodDays = { '7d': 7, '30d': 30, '90d': 90, 'all': 365 }

function fmtDate(d) {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

function accuracyColor(pct) {
  if (pct >= 70) return '#22c55e'
  if (pct >= 50) return '#f59e0b'
  return '#ef4444'
}

// ─── Custom tooltip for line chart ───────────────────────────────────────────

function EvolutionTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="text-ink-3 mb-1">{label}</p>
      <p className="text-ink font-semibold">{d?.accuracy}% de acertos</p>
      <p className="text-ink-4">{d?.correct}/{d?.total} corretas</p>
    </div>
  )
}

function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="text-ink font-semibold mb-1 truncate max-w-[180px]">{d?.subject_area ?? d?.topic}</p>
      <p style={{ color: accuracyColor(d?.accuracy_pct) }}>{d?.accuracy_pct}% acertos</p>
      <p className="text-ink-4">{d?.total} questões</p>
    </div>
  )
}

// ─── Wrong answer card ────────────────────────────────────────────────────────

function WrongAnswerCard({ item }) {
  const [expanded, setExpanded] = useState(false)
  const q = item.questions
  return (
    <div className="card !p-0 overflow-hidden">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-5 py-4 hover:bg-surface-3 transition-colors">
        <div className="flex items-start gap-3">
          <XCircle size={16} className="text-error mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {item.subject_area && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-medium">{item.subject_area}</span>
              )}
              {item.topic && (
                <span className="text-[10px] text-ink-4 truncate max-w-[200px]">{item.topic}</span>
              )}
              <span className="text-[10px] text-ink-4 ml-auto shrink-0">
                {new Date(item.answered_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <p className="text-sm text-ink-2 leading-snug line-clamp-2">{q?.statement}</p>
          </div>
          <ChevronRight size={14} className={`text-ink-4 shrink-0 mt-1 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {expanded && q && (
        <div className="border-t border-surface-3 px-5 pb-4">
          {/* Options */}
          <div className="mt-3 space-y-1.5">
            {(q.options ?? []).sort((a, b) => a.letter.localeCompare(b.letter)).map(opt => (
              <div key={opt.letter} className={`flex gap-2.5 items-start px-3 py-2 rounded-lg text-xs ${
                opt.letter === q.correct_letter    ? 'bg-success/10 text-success border border-success/30' :
                opt.letter === item.answer_given   ? 'bg-error/10 text-error border border-error/30' :
                'text-ink-3'
              }`}>
                <span className="font-bold shrink-0 mt-0.5">{opt.letter}</span>
                <span className="leading-relaxed">{opt.text}</span>
                {opt.letter === q.correct_letter && <CheckCircle size={12} className="shrink-0 mt-0.5 ml-auto" />}
              </div>
            ))}
          </div>

          {/* Explanation */}
          {q.explanation && (
            <div className="mt-3 p-3 rounded-lg bg-surface-3 text-xs text-ink-3 leading-relaxed">
              <span className="text-accent font-semibold">Explicação: </span>{q.explanation}
            </div>
          )}

          {/* Action */}
          <Link to={`/questoes?topic=${encodeURIComponent(item.topic ?? '')}&subject_area=${encodeURIComponent(item.subject_area ?? '')}`}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
            <RotateCcw size={12} /> Praticar esse assunto
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Desempenho() {
  const [period,        setPeriod]       = useState('30d')
  const [stats,         setStats]        = useState(null)
  const [evolution,     setEvolution]    = useState([])
  const [bySubject,     setBySubject]    = useState([])
  const [drillSubject,  setDrillSubject] = useState(null)  // null = view all subjects
  const [byTopic,       setByTopic]      = useState([])
  const [history,       setHistory]      = useState([])
  const [histPage,      setHistPage]     = useState(1)
  const [histPages,     setHistPages]    = useState(1)
  const [histTotal,     setHistTotal]    = useState(0)
  const [onlyWrong,     setOnlyWrong]    = useState(true)
  const [loading,       setLoading]      = useState(true)
  const [loadingDrill,  setLoadingDrill] = useState(false)
  const [loadingHist,   setLoadingHist]  = useState(false)

  // ── Load base stats + evolution + history ────────────────────────────────
  useEffect(() => {
    setLoading(true)
    const days = periodDays[period]
    Promise.all([
      api.get('/api/stats').catch(() => null),
      api.get(`/api/stats/evolution?days=${days}`).catch(() => []),
    ]).then(([s, ev]) => {
      setStats(s)
      setEvolution(ev ?? [])
      setBySubject(s?.by_subject ?? [])
      setDrillSubject(null)
    }).finally(() => setLoading(false))
  }, [period])

  // ── Load answer history ──────────────────────────────────────────────────
  const loadHistory = useCallback((pg = 1) => {
    setLoadingHist(true)
    const params = new URLSearchParams({
      page: pg, limit: 10,
      period,
      ...(onlyWrong ? { is_correct: 'false' } : {}),
    })
    api.get(`/api/answers/history?${params}`)
      .then(r => { setHistory(r.data ?? []); setHistPages(r.pages ?? 1); setHistTotal(r.count ?? 0); setHistPage(pg) })
      .catch(() => setHistory([]))
      .finally(() => setLoadingHist(false))
  }, [period, onlyWrong])

  useEffect(() => { loadHistory(1) }, [loadHistory])

  // ── Drill into subject → topics ──────────────────────────────────────────
  const handleSubjectClick = useCallback((subject) => {
    setDrillSubject(subject)
    setLoadingDrill(true)
    api.get(`/api/stats/by-topic?subject_area=${encodeURIComponent(subject)}`)
      .then(r => setByTopic(r ?? []))
      .catch(() => setByTopic([]))
      .finally(() => setLoadingDrill(false))
  }, [])

  const overall = stats?.overall
  const streak  = stats?.streak ?? 0

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Desempenho</h1>
          <p className="text-sm text-ink-3 mt-1">Acompanhe sua evolução e identifique pontos de melhoria</p>
        </div>
        {/* Period filter */}
        <div className="flex bg-surface-2 border border-surface-3 rounded-xl p-1 gap-1">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p.value ? 'bg-accent text-white shadow-sm' : 'text-ink-3 hover:text-ink'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: TrendingUp, label: 'Aproveitamento', value: loading ? '…' : overall?.accuracy_pct != null ? `${overall.accuracy_pct}%` : '—', color: 'text-success', bg: 'bg-success/10' },
          { icon: BookOpen,   label: 'Questões feitas', value: loading ? '…' : (overall?.total_answers ?? 0), color: 'text-accent', bg: 'bg-accent/10' },
          { icon: Flame,      label: 'Streak atual',    value: loading ? '…' : `${streak}d`, color: 'text-warning', bg: 'bg-warning/10' },
          { icon: Calendar,   label: 'Dias estudados',  value: loading ? '…' : (overall?.days_studied ?? 0), color: 'text-blue-400', bg: 'bg-blue-400/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
              <Icon size={19} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink leading-none">{value}</p>
              <p className="text-xs text-ink-3 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Evolution chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-ink">Evolução do aproveitamento</h2>
          <span className="text-xs text-ink-4">{PERIODS.find(p => p.value === period)?.label}</span>
        </div>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 size={20} className="text-ink-4 animate-spin" />
          </div>
        ) : evolution.length < 2 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-ink-4">
            <BarChart2 size={24} />
            <p className="text-xs">Responda mais questões para ver a evolução</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={evolution} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e2e33" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<EvolutionTooltip />} />
              <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} />
              <Line type="monotone" dataKey="accuracy" stroke="#7c6af7" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#7c6af7', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Subject / Topic bar chart */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          {drillSubject && (
            <button onClick={() => setDrillSubject(null)}
              className="p-1.5 rounded-lg hover:bg-surface-3 text-ink-3 hover:text-ink transition-all">
              <ArrowLeft size={15} />
            </button>
          )}
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-ink">
              {drillSubject ? `${drillSubject} — por assunto` : 'Aproveitamento por matéria'}
            </h2>
            {!drillSubject && <p className="text-xs text-ink-4 mt-0.5">Clique em uma barra para ver por assunto</p>}
          </div>
        </div>

        {loadingDrill ? (
          <div className="h-56 flex items-center justify-center">
            <Loader2 size={20} className="text-ink-4 animate-spin" />
          </div>
        ) : (
          (() => {
            const chartData = drillSubject
              ? byTopic.map(d => ({ ...d, name: d.topic?.length > 30 ? d.topic.slice(0, 30) + '…' : d.topic, accuracy_pct: d.accuracy }))
              : bySubject.map(d => ({ ...d, name: d.subject_area }))
            return chartData.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center gap-2 text-ink-4">
                <BarChart2 size={24} />
                <p className="text-xs">Nenhum dado disponível</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 36)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 50, bottom: 0, left: 8 }}
                  onClick={drillSubject ? undefined : (e) => e?.activePayload?.[0] && handleSubjectClick(e.activePayload[0].payload.subject_area)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e2e33" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={drillSubject ? 160 : 100} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="accuracy_pct" radius={[0, 6, 6, 0]} cursor={drillSubject ? 'default' : 'pointer'}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={accuracyColor(entry.accuracy_pct)} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          })()
        )}
      </div>

      {/* Wrong answers history */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Histórico de questões</h2>
            {histTotal > 0 && <p className="text-xs text-ink-4 mt-0.5">{histTotal} {onlyWrong ? 'erros' : 'respostas'} encontrados</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setOnlyWrong(w => !w)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                onlyWrong ? 'bg-error/10 border-error/30 text-error' : 'border-surface-4 text-ink-3 hover:border-surface-5 hover:text-ink'
              }`}>
              <XCircle size={12} /> Só erros
            </button>
          </div>
        </div>

        {loadingHist ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-ink-4 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="card flex flex-col items-center py-12 gap-3 text-center">
            <CheckCircle size={28} className="text-success" />
            <p className="text-sm text-ink">
              {onlyWrong ? 'Nenhum erro encontrado nesse período! 🎉' : 'Nenhuma questão respondida ainda.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(item => <WrongAnswerCard key={item.id} item={item} />)}
          </div>
        )}

        {/* Pagination */}
        {histPages > 1 && !loadingHist && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => loadHistory(histPage - 1)} disabled={histPage === 1}
              className="p-2 rounded-lg border border-surface-4 hover:bg-surface-3 disabled:opacity-30 text-ink-3 transition-all">
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs text-ink-3 tabular-nums">{histPage} / {histPages}</span>
            <button onClick={() => loadHistory(histPage + 1)} disabled={histPage === histPages}
              className="p-2 rounded-lg border border-surface-4 hover:bg-surface-3 disabled:opacity-30 text-ink-3 transition-all">
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
