import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { Flame, BookOpen, CalendarDays, ArrowRight, Zap, TrendingUp } from 'lucide-react'

function greeting(name) {
  const h = new Date().getHours()
  return `${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}, ${name}! 👋`
}

function StatCard({ icon: Icon, label, value, sub, color = 'accent' }) {
  const cls = { accent:'bg-accent/10 text-accent', success:'bg-success/10 text-success', warning:'bg-warning/10 text-warning', error:'bg-error/10 text-error' }
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cls[color]}`}><Icon size={19} /></div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-ink leading-none">{value ?? '—'}</p>
        <p className="text-xs text-ink-3 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-ink-4 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function StreakBar({ streak }) {
  const labels = ['D','S','T','Q','Q','S','S']
  const today  = new Date().getDay()
  return (
    <div className="flex items-end gap-1.5">
      {labels.map((d, i) => {
        const daysAgo = ((today - i) + 7) % 7
        const active  = daysAgo < streak
        const isToday = i === today
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all
              ${active ? isToday ? 'bg-accent text-white shadow-md shadow-accent/30' : 'bg-accent/20 text-accent' : 'bg-surface-3 text-ink-4'}`}>
              {isToday ? <Flame size={14} /> : d}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/stats').then(setStats).catch(() => setStats(null)).finally(() => setLoading(false))
  }, [])

  const name    = profile?.display_name ?? 'Aluno'
  const streak  = stats?.streak ?? 0
  const overall = stats?.overall

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">{greeting(name)}</h1>
        <p className="text-sm text-ink-3 mt-1">{new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Flame}     label="Dias seguidos"   value={loading ? '...' : streak} sub={streak > 0 ? 'Continue assim! 🔥' : 'Comece hoje!'} color="warning" />
        <StatCard icon={BookOpen}  label="Questões feitas" value={loading ? '...' : (overall?.total_answers ?? 0)} sub="no total" color="accent" />
        <StatCard icon={TrendingUp} label="Aproveitamento"  value={loading ? '...' : (overall?.accuracy_pct != null ? `${overall.accuracy_pct}%` : '—')} sub="de acertos" color={overall?.accuracy_pct >= 70 ? 'success' : 'error'} />
        <StatCard icon={Zap}       label="Matérias"        value={loading ? '...' : (overall?.subjects_touched ?? 0)} sub="estudadas" color="success" />
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Plano do dia */}
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink">Seu plano de hoje</h2>
          </div>
          <div className="flex flex-col items-center py-8 text-center gap-3">
            <CalendarDays size={28} className="text-ink-4" />
            <p className="text-sm text-ink-3">Nenhuma tarefa programada para hoje.</p>
            <Link to="/plano" className="btn-primary text-sm px-4 py-2">
              Montar plano de estudos <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Streak + Matérias */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Flame size={17} className="text-warning" />
              <h2 className="text-sm font-semibold text-ink">Streak semanal</h2>
              <span className="ml-auto badge bg-warning/10 text-warning">{streak} {streak === 1 ? 'dia' : 'dias'}</span>
            </div>
            <StreakBar streak={streak} />
            <p className="text-xs text-ink-3 mt-3">
              {streak === 0 ? 'Estude hoje para começar sua sequência!'
               : streak < 3 ? 'Boa sequência! Continue amanhã.'
               : streak < 7 ? `${streak} dias seguidos — você está pegando o ritmo! 💪`
               : `${streak} dias — incrível! Você está dominando! 🔥`}
            </p>
          </div>

          {stats?.by_subject?.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-ink">Por matéria</h2>
                <Link to="/desempenho" className="text-xs text-accent hover:underline">Ver tudo</Link>
              </div>
              <div className="space-y-2.5">
                {stats.by_subject.slice(0,4).map(s => (
                  <div key={s.subject_area}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink-2 truncate">{s.subject_area}</span>
                      <span className={`font-medium ${s.accuracy_pct >= 70 ? 'text-success' : s.accuracy_pct >= 50 ? 'text-warning' : 'text-error'}`}>{s.accuracy_pct}%</span>
                    </div>
                    <div className="h-1 bg-surface-4 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${s.accuracy_pct >= 70 ? 'bg-success' : s.accuracy_pct >= 50 ? 'bg-warning' : 'bg-error'}`} style={{ width: `${s.accuracy_pct}%` }} />
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
