import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { Flame, BookOpen, CalendarDays, ArrowRight, Zap, TrendingUp } from 'lucide-react'

function greeting(name) {
  const h = new Date().getHours()
  const period = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  return { period, name }
}

/* ── Stat Card ── */
function StatCard({ icon: Icon, label, value, sub, color = 'accent' }) {
  const iconStyles = {
    accent:  { bg: 'rgb(var(--accent-rgb) / 0.12)', color: 'rgb(var(--accent-rgb))', glow: 'rgb(var(--accent-rgb) / 0.2)' },
    success: { bg: 'rgb(34 197 94 / 0.12)',          color: '#22c55e',                 glow: 'rgb(34 197 94 / 0.2)' },
    warning: { bg: 'rgb(245 158 11 / 0.12)',         color: '#f59e0b',                 glow: 'rgb(245 158 11 / 0.2)' },
    error:   { bg: 'rgb(239 68 68 / 0.12)',          color: '#ef4444',                 glow: 'rgb(239 68 68 / 0.2)' },
  }
  const s = iconStyles[color]

  return (
    <div className="card-glow flex items-center gap-4 group">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
        style={{
          background: s.bg,
          color: s.color,
          boxShadow: `0 0 16px -2px ${s.glow}`,
        }}
      >
        <Icon size={19} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="font-heading text-3xl font-bold text-ink leading-none tracking-tight">
          {value ?? '—'}
        </p>
        <p className="label mt-1.5">{label}</p>
        {sub && <p className="text-[11px] text-ink-4 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

/* ── Streak Bar ── */
function StreakBar({ streak }) {
  const labels = ['D','S','T','Q','Q','S','S']
  const today  = new Date().getDay()

  return (
    <div className="flex items-end gap-2">
      {labels.map((d, i) => {
        const daysAgo = ((today - i) + 7) % 7
        const active  = daysAgo < streak
        const isToday = i === today

        return (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                active
                  ? isToday
                    ? 'text-white animate-glow-pulse'
                    : 'text-accent'
                  : 'text-ink-4'
              }`}
              style={
                active
                  ? isToday
                    ? {
                        background: 'linear-gradient(135deg, rgb(var(--accent-rgb)), rgb(var(--accent-rgb) / 0.7))',
                        boxShadow: '0 2px 12px rgb(var(--accent-rgb) / 0.35)',
                      }
                    : { background: 'rgb(var(--accent-rgb) / 0.12)' }
                  : { background: 'rgb(255 255 255 / 0.03)' }
              }
            >
              {isToday ? <Flame size={15} strokeWidth={2.5} /> : d}
            </div>
            <span className="text-[9px] uppercase tracking-[0.1em] text-ink-4 font-medium">
              {['dom','seg','ter','qua','qui','sex','sáb'][i]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Dashboard ── */
export default function Dashboard() {
  const { profile } = useAuth()
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/stats').then(setStats).catch(() => setStats(null)).finally(() => setLoading(false))
  }, [])

  const { period, name } = greeting(profile?.display_name ?? 'Aluno')
  const streak  = stats?.streak ?? 0
  const overall = stats?.overall

  return (
    <div className="space-y-10 animate-fade-in">
      {/* ── Header ── */}
      <div>
        <p className="label mb-2">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="font-heading text-3xl font-bold text-ink tracking-tight">
          {period}, <span className="text-gradient">{name}</span>
        </h1>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Flame}
          label="Dias seguidos"
          value={loading ? '...' : streak}
          sub={streak > 0 ? 'Continue assim!' : 'Comece hoje!'}
          color="warning"
        />
        <StatCard
          icon={BookOpen}
          label="Questões feitas"
          value={loading ? '...' : (overall?.total_answers ?? 0)}
          sub="no total"
          color="accent"
        />
        <StatCard
          icon={TrendingUp}
          label="Aproveitamento"
          value={loading ? '...' : (overall?.accuracy_pct != null ? `${overall.accuracy_pct}%` : '—')}
          sub="de acertos"
          color={overall?.accuracy_pct >= 70 ? 'success' : 'error'}
        />
        <StatCard
          icon={Zap}
          label="Matérias"
          value={loading ? '...' : (overall?.subjects_touched ?? 0)}
          sub="estudadas"
          color="success"
        />
      </div>

      {/* ── Two columns ── */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Plano do dia */}
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-sm font-bold text-ink tracking-tight">Seu plano de hoje</h2>
          </div>
          <div className="flex flex-col items-center py-10 text-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgb(var(--s3))',
                border: '1px solid rgb(255 255 255 / 0.06)',
              }}
            >
              <CalendarDays size={24} className="text-ink-3" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink-2">Nenhuma tarefa programada</p>
              <p className="text-[12px] text-ink-4 mt-1">Monte seu plano de estudos para organizar sua rotina</p>
            </div>
            <Link to="/plano" className="btn-primary text-sm mt-1">
              Montar plano de estudos
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Streak + Matérias */}
        <div className="lg:col-span-2 space-y-5">
          {/* Streak semanal */}
          <div className="card">
            <div className="flex items-center gap-2.5 mb-5">
              <Flame size={16} className="text-warning" />
              <h2 className="font-heading text-sm font-bold text-ink tracking-tight">Streak semanal</h2>
              <span
                className="ml-auto badge text-warning text-[11px]"
                style={{ background: 'rgb(245 158 11 / 0.1)' }}
              >
                {streak} {streak === 1 ? 'dia' : 'dias'}
              </span>
            </div>
            <StreakBar streak={streak} />
            <p className="text-[12px] text-ink-3 mt-4 leading-relaxed">
              {streak === 0
                ? 'Estude hoje para começar sua sequência!'
                : streak < 3
                  ? 'Boa sequência! Continue amanhã.'
                  : streak < 7
                    ? `${streak} dias seguidos — pegando o ritmo!`
                    : `${streak} dias seguidos — incrível!`}
            </p>
          </div>

          {/* Por matéria */}
          {stats?.by_subject?.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-sm font-bold text-ink tracking-tight">Por matéria</h2>
                <Link to="/desempenho" className="text-[12px] text-accent hover:text-accent-hover transition-colors duration-200">
                  Ver tudo
                </Link>
              </div>
              <div className="space-y-3.5">
                {stats.by_subject.slice(0, 4).map((s, idx) => (
                  <div key={s.subject_area} className="group">
                    <div className="flex justify-between text-[12px] mb-1.5">
                      <span className="text-ink-2 truncate font-medium">{s.subject_area}</span>
                      <span className={`font-bold tabular-nums ${
                        s.accuracy_pct >= 70 ? 'text-success' : s.accuracy_pct >= 50 ? 'text-warning' : 'text-error'
                      }`}>
                        {s.accuracy_pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(255 255 255 / 0.04)' }}>
                      <div
                        className={`h-full rounded-full animate-progress-fill ${
                          s.accuracy_pct >= 70 ? 'bg-success' : s.accuracy_pct >= 50 ? 'bg-warning' : 'bg-error'
                        }`}
                        style={{
                          width: `${s.accuracy_pct}%`,
                          animationDelay: `${idx * 100}ms`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
