import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { isAdminEmail } from '../App'
import {
  Users, BookOpen, MessageSquare, Activity, Globe,
  Phone, Bot, ChevronRight, ChevronLeft, Search, X,
  Loader2, CheckCircle, XCircle, TrendingUp, Clock,
  BarChart2, AlertTriangle, RefreshCw, DollarSign,
} from 'lucide-react'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LineChart, Line,
} from 'recharts'

// ─── Cost estimation ──────────────────────────────────────────────────────────
// Per message: 900 in Opus + 200 out Opus + 600 in Haiku + 50 out Haiku
// Prices (per 1M tokens): Opus in $5 / out $25 | Haiku in $1 / out $5
const COST_PER_MSG_USD =
  (900 * 5 + 200 * 25 + 600 * 1 + 50 * 5) / 1_000_000  // = 0.01035
const BRL_RATE = 5.80
const COST_PER_MSG_BRL = COST_PER_MSG_USD * BRL_RATE    // ≈ R$ 0,0601

function calcCost(userMessages) {
  return (userMessages ?? 0) * COST_PER_MSG_BRL
}

function fmtCost(brl) {
  if (brl === 0) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  }).format(brl)
}

function costForPeriod(conversations, days) {
  const since = days ? new Date(Date.now() - days * 86_400_000) : null
  const count = (conversations ?? []).filter(m => {
    if (m.role !== 'user') return false
    if (!since) return true
    const ts = m.timestamp ?? m.created_at
    return ts && new Date(ts) >= since
  }).length
  return calcCost(count)
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function fmtDateShort(d) {
  if (!d) return '—'
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}
function fmtDatetime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function timeAgo(d) {
  if (!d) return '—'
  const sec = Math.floor((Date.now() - new Date(d)) / 1000)
  if (sec < 60)   return `${sec}s atrás`
  if (sec < 3600) return `${Math.floor(sec/60)}min atrás`
  if (sec < 86400) return `${Math.floor(sec/3600)}h atrás`
  return `${Math.floor(sec/86400)}d atrás`
}

const CHANNEL_COLORS = { web: '#7c6af7', whatsapp: '#22c55e', telegram: '#3b82f6' }
const CHANNEL_LABELS = { web: 'Web', whatsapp: 'WhatsApp', telegram: 'Telegram' }

function ChannelBadge({ channel, active = true }) {
  const colors = {
    web:      active ? 'bg-accent/15 text-accent border-accent/20'       : 'bg-surface-3 text-ink-4 border-surface-4',
    whatsapp: active ? 'bg-success/15 text-success border-success/20'    : 'bg-surface-3 text-ink-4 border-surface-4',
    telegram: active ? 'bg-blue-400/15 text-blue-400 border-blue-400/20' : 'bg-surface-3 text-ink-4 border-surface-4',
  }
  const icons = { web: Globe, whatsapp: Phone, telegram: Bot }
  const Icon = icons[channel]
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${colors[channel] ?? colors.web}`}>
      <Icon size={9} /> {CHANNEL_LABELS[channel]}
    </span>
  )
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

function ActivityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="text-ink-3 mb-1.5">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="flex items-center gap-1.5" style={{ color: p.fill }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
          {CHANNEL_LABELS[p.dataKey] ?? p.dataKey}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ─── Overview cards ───────────────────────────────────────────────────────────

function OverviewCards({ stats, loading, totalCost }) {
  const cards = [
    { icon: Users,        label: 'Usuários totais',   value: stats?.total_users,           sub: `${stats?.total_web_users ?? 0} web + ${stats?.total_bot_only ?? 0} bot`, color: 'text-accent',   bg: 'bg-accent/10'   },
    { icon: BookOpen,     label: 'Questões hoje',     value: stats?.answers_today,         sub: 'respondidas hoje',                                                        color: 'text-success',  bg: 'bg-success/10'  },
    { icon: MessageSquare,label: 'Mensagens hoje',    value: stats?.messages_today,        sub: 'para o tutor',                                                            color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { icon: Activity,     label: 'Sessões ativas hj', value: stats?.active_sessions_today, sub: 'com atividade hoje',                                                      color: 'text-warning',  bg: 'bg-warning/10'  },
    { icon: DollarSign,   label: 'Custo total',       value: loading ? null : fmtCost(totalCost ?? 0), sub: 'estimativa acumulada',                                       color: 'text-orange-400', bg: 'bg-orange-400/10', isText: true },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map(({ icon: Icon, label, value, sub, color, bg, isText }) => (
        <div key={label} className="card flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
            <Icon size={17} className={color} />
          </div>
          <div className="min-w-0">
            <p className={`font-bold text-ink leading-none ${isText ? 'text-lg' : 'text-2xl'}`}>
              {loading ? <span className="animate-pulse text-ink-4">…</span> : (value ?? 0)}
            </p>
            <p className="text-xs text-ink-3 mt-0.5">{label}</p>
            <p className="text-[10px] text-ink-4 mt-0.5">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Activity chart ───────────────────────────────────────────────────────────

function ActivityChart({ data, loading }) {
  if (loading) return (
    <div className="card h-56 flex items-center justify-center">
      <Loader2 size={20} className="text-ink-4 animate-spin" />
    </div>
  )
  if (!data?.length) return (
    <div className="card h-56 flex items-center justify-center text-ink-4">
      <BarChart2 size={24} className="mr-2" /> Nenhuma atividade no período
    </div>
  )
  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-ink mb-4">Usuários ativos por dia</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2e2e33" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<ActivityTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
            formatter={v => CHANNEL_LABELS[v] ?? v} />
          <Bar dataKey="web"       fill={CHANNEL_COLORS.web}       stackId="a" radius={[0,0,0,0]} />
          <Bar dataKey="whatsapp"  fill={CHANNEL_COLORS.whatsapp}  stackId="a" radius={[0,0,0,0]} />
          <Bar dataKey="telegram"  fill={CHANNEL_COLORS.telegram}  stackId="a" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── User detail modal ────────────────────────────────────────────────────────

function UserDetailModal({ user, onClose }) {
  const [tab,     setTab]     = useState('answers')  // answers | conversations
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = encodeURIComponent(user.id)
    api.get(`/api/admin/users/${id}/history`)
      .then(setHistory)
      .catch(() => setHistory({ answers: [], conversations: [], sessions_summary: [] }))
      .finally(() => setLoading(false))
  }, [user.id])

  const accuracy = user.total_answers > 0
    ? Math.round((user.correct_answers / user.total_answers) * 100) : null

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface-1 border border-surface-3 rounded-t-2xl sm:rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-surface-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent font-bold shrink-0">
            {(user.display_name || user.email || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-ink">{user.display_name ?? '(sem nome)'}</span>
              <span className="text-xs text-ink-4">{user.email ?? user.id}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {user.channels.web      && <ChannelBadge channel="web"      active={true} />}
              {user.channels.whatsapp && <ChannelBadge channel="whatsapp" active={true} />}
              {user.channels.telegram && <ChannelBadge channel="telegram" active={true} />}
            </div>
          </div>
          {/* Quick stats */}
          <div className="hidden sm:flex items-center gap-4 text-center mr-2">
            <div>
              <div className="text-lg font-bold text-ink">{user.total_answers}</div>
              <div className="text-[10px] text-ink-4">questões</div>
            </div>
            <div>
              <div className={`text-lg font-bold ${accuracy == null ? 'text-ink-4' : accuracy >= 70 ? 'text-success' : accuracy >= 50 ? 'text-warning' : 'text-error'}`}>
                {accuracy != null ? `${accuracy}%` : '—'}
              </div>
              <div className="text-[10px] text-ink-4">acertos</div>
            </div>
            <div>
              <div className="text-lg font-bold text-ink">{user.total_messages}</div>
              <div className="text-[10px] text-ink-4">mensagens</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-3 text-ink-4 hover:text-ink transition-all ml-auto shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Cost breakdown */}
        <div className="px-5 py-3.5 border-b border-surface-3 bg-surface-2/40 flex-shrink-0">
          <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider mb-2.5">
            Custo estimado
            <span className="ml-1.5 font-normal text-ink-4 normal-case tracking-normal">
              (R$ {(COST_PER_MSG_BRL).toFixed(4)}/msg)
            </span>
          </p>
          {loading ? (
            <div className="flex gap-3">
              {[0,1,2].map(i => <div key={i} className="h-12 flex-1 rounded-xl bg-surface-3 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '7 dias',  days: 7   },
                { label: '30 dias', days: 30  },
                { label: 'Total',   days: null },
              ].map(({ label, days }) => {
                const cost = costForPeriod(history?.conversations, days)
                return (
                  <div key={label} className="bg-surface-2 border border-surface-3 rounded-xl p-3 text-center">
                    <p className={`text-base font-bold ${cost > 0 ? 'text-orange-400' : 'text-ink-4'}`}>
                      {fmtCost(cost)}
                    </p>
                    <p className="text-[10px] text-ink-4 mt-0.5">{label}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-3 px-5 flex-shrink-0">
          {[
            { id: 'answers',       label: `Respostas (${history?.answers?.length ?? '…'})` },
            { id: 'conversations', label: `Conversas (${history?.conversations?.length ?? '…'})` },
            { id: 'sessions',      label: 'Sessões' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-accent text-accent' : 'border-transparent text-ink-4 hover:text-ink'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="text-ink-4 animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Answers tab ── */}
              {tab === 'answers' && (
                <div className="divide-y divide-surface-3">
                  {!history?.answers?.length ? (
                    <div className="flex flex-col items-center py-12 text-ink-4 gap-2">
                      <BookOpen size={24} />
                      <p className="text-sm">Nenhuma questão respondida ainda</p>
                    </div>
                  ) : history.answers.map(a => (
                    <div key={a.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-surface-2 transition-colors">
                      {a.is_correct
                        ? <CheckCircle size={15} className="text-success mt-0.5 shrink-0" />
                        : <XCircle    size={15} className="text-error mt-0.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-ink-2 leading-snug line-clamp-2">{a.questions?.statement ?? '—'}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {a.subject_area && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent">{a.subject_area}</span>}
                          {a.topic && <span className="text-[10px] text-ink-4 truncate max-w-[160px]">{a.topic}</span>}
                          <span className="text-[10px] text-ink-4 ml-auto">{fmtDatetime(a.answered_at)}</span>
                        </div>
                        {!a.is_correct && a.questions?.correct_letter && (
                          <p className="text-[10px] text-ink-4 mt-0.5">
                            Respondeu: <strong className="text-error">{a.answer_given}</strong> · Correto: <strong className="text-success">{a.questions.correct_letter}</strong>
                          </p>
                        )}
                        {/* Channel badge */}
                        {a.phone && (
                          <span className="inline-flex items-center gap-1 mt-1">
                            <ChannelBadge
                              channel={a.phone.startsWith('web:') ? 'web' : a.phone.startsWith('whatsapp:') ? 'whatsapp' : 'telegram'}
                              active={true} />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Conversations tab ── */}
              {tab === 'conversations' && (
                <div className="divide-y divide-surface-3">
                  {!history?.conversations?.length ? (
                    <div className="flex flex-col items-center py-12 text-ink-4 gap-2">
                      <MessageSquare size={24} />
                      <p className="text-sm">Sem histórico de conversas</p>
                    </div>
                  ) : history.conversations.map((m, i) => (
                    <div key={i} className={`flex gap-3 px-5 py-3 ${m.role === 'user' ? '' : 'bg-surface-2/50'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        m.role === 'user' ? 'bg-accent/20 text-accent' : 'bg-surface-4 text-ink-3'
                      }`}>
                        {m.role === 'user' ? 'A' : 'T'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-medium text-ink-3">{m.role === 'user' ? 'Aluno' : 'Tutor'}</span>
                          <ChannelBadge channel={m.channel} active={true} />
                          {m.timestamp && <span className="text-[10px] text-ink-4 ml-auto">{fmtDatetime(m.timestamp)}</span>}
                        </div>
                        <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-wrap break-words">
                          {typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Sessions tab ── */}
              {tab === 'sessions' && (
                <div className="px-5 py-4 space-y-3">
                  {!history?.sessions_summary?.length ? (
                    <div className="flex flex-col items-center py-12 text-ink-4 gap-2">
                      <Activity size={24} />
                      <p className="text-sm">Sem sessões registradas</p>
                    </div>
                  ) : history.sessions_summary.map((s, i) => {
                    const channel = s.phone?.startsWith('web:') ? 'web'
                                  : s.phone?.startsWith('whatsapp:') ? 'whatsapp' : 'telegram'
                    return (
                      <div key={i} className="card !p-4 flex items-center gap-3">
                        <ChannelBadge channel={channel} active={true} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-ink-2 font-mono truncate">{s.phone}</p>
                          <p className="text-[10px] text-ink-4 mt-0.5">
                            Último acesso: {fmtDatetime(s.updated_at)} · {s.msg_count} mensagens
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-ink">{s.correct_count}/{s.total_count}</p>
                          <p className="text-[10px] text-ink-4">acertos</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── User table ───────────────────────────────────────────────────────────────

function UserTable({ users, loading, onSelect }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('last_active') // last_active | total_answers | total_messages | cost

  const filtered = (users ?? []).filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (u.display_name ?? '').toLowerCase().includes(q)
        || (u.email ?? '').toLowerCase().includes(q)
        || (u.whatsapp_phone ?? '').includes(q)
        || (u.telegram_id ?? '').includes(q)
  }).sort((a, b) => {
    if (sortBy === 'total_answers')  return (b.total_answers  ?? 0) - (a.total_answers  ?? 0)
    if (sortBy === 'total_messages') return (b.total_messages ?? 0) - (a.total_messages ?? 0)
    if (sortBy === 'cost')           return calcCost(b.user_messages ?? 0) - calcCost(a.user_messages ?? 0)
    return (b.last_active ?? '') > (a.last_active ?? '') ? 1 : -1
  })

  return (
    <div className="card !p-0 overflow-hidden">
      {/* Table header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, email…"
            className="w-full bg-surface-2 border border-surface-4 rounded-lg pl-8 pr-3 py-2 text-xs text-ink placeholder:text-ink-4 focus:outline-none focus:border-accent/60" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex bg-surface-2 border border-surface-3 rounded-lg p-0.5 gap-0.5 flex-shrink-0">
          {[
            { id: 'last_active',    label: 'Recentes'  },
            { id: 'total_answers',  label: 'Questões'  },
            { id: 'total_messages', label: 'Mensagens' },
            { id: 'cost',           label: 'Custo'     },
          ].map(s => (
            <button key={s.id} onClick={() => setSortBy(s.id)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
                sortBy === s.id ? 'bg-accent text-white' : 'text-ink-4 hover:text-ink'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-ink-4 flex-shrink-0">{filtered.length} usuários</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="text-ink-4 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-ink-4 gap-2">
          <Users size={24} />
          <p className="text-sm">{search ? 'Nenhum resultado' : 'Sem usuários ainda'}</p>
        </div>
      ) : (
        <div className="divide-y divide-surface-3">
          {filtered.map(user => {
            const accuracy = user.total_answers > 0
              ? Math.round((user.correct_answers / user.total_answers) * 100) : null

            return (
              <button key={user.id} onClick={() => onSelect(user)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2 transition-colors text-left group">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center text-accent text-sm font-bold shrink-0">
                  {(user.display_name || user.email || '?')[0].toUpperCase()}
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-ink truncate">
                      {user.display_name ?? <span className="text-ink-4 italic">sem nome</span>}
                    </span>
                    {user.type === 'web' && (
                      <span className="text-[10px] text-ink-4 truncate">{user.email}</span>
                    )}
                  </div>
                  {/* Channels */}
                  <div className="flex items-center gap-1 mt-1">
                    {['web','whatsapp','telegram'].map(ch => (
                      user.channels[ch] && <ChannelBadge key={ch} channel={ch} active={true} />
                    ))}
                    <span className="text-[10px] text-ink-4 ml-1.5">{timeAgo(user.last_active)}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <p className="text-sm font-semibold text-ink">{user.total_answers}</p>
                    <p className="text-[10px] text-ink-4">questões</p>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${
                      accuracy == null ? 'text-ink-4' : accuracy >= 70 ? 'text-success' : accuracy >= 50 ? 'text-warning' : 'text-error'
                    }`}>
                      {accuracy != null ? `${accuracy}%` : '—'}
                    </p>
                    <p className="text-[10px] text-ink-4">acertos</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{user.user_messages}</p>
                    <p className="text-[10px] text-ink-4">msgs</p>
                  </div>
                  <div className="border-l border-surface-4 pl-4">
                    <p className="text-sm font-semibold text-orange-400">{fmtCost(calcCost(user.user_messages ?? 0))}</p>
                    <p className="text-[10px] text-ink-4">custo</p>
                  </div>
                </div>

                <ChevronRight size={14} className="text-ink-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Admin() {
  const { user } = useAuth()
  const [stats,    setStats]    = useState(null)
  const [users,    setUsers]    = useState([])
  const [activity, setActivity] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState(null)
  const [days,     setDays]     = useState(30)

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (!user || !isAdminEmail(user.email)) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle size={32} className="text-error mx-auto" />
          <h1 className="text-lg font-bold text-ink">Acesso restrito</h1>
          <p className="text-sm text-ink-3">Esta página é exclusiva para administradores.</p>
        </div>
      </div>
    )
  }

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true)
    try {
      const [s, u, a] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
        api.get(`/api/admin/activity?days=${days}`),
      ])
      setStats(s)
      setUsers(u)
      setActivity(a)
    } catch (err) {
      console.error('[admin] load error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [days])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-error/10 text-error border border-error/20 font-semibold uppercase tracking-wider">Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Painel de Administração</h1>
          <p className="text-sm text-ink-3 mt-0.5">Visão unificada de todos os alunos e canais</p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-4 text-ink-3 text-sm hover:bg-surface-3 hover:text-ink transition-all disabled:opacity-60">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Overview cards */}
      <OverviewCards
        stats={stats}
        loading={loading}
        totalCost={users.reduce((sum, u) => sum + calcCost(u.user_messages ?? 0), 0)}
      />

      {/* Activity chart */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink">Atividade por canal</h2>
          <div className="flex bg-surface-2 border border-surface-3 rounded-xl p-0.5 gap-0.5">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                  days === d ? 'bg-accent text-white' : 'text-ink-4 hover:text-ink'
                }`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        <ActivityChart data={activity} loading={loading} />
      </div>

      {/* Users table */}
      <div>
        <h2 className="text-sm font-semibold text-ink mb-3">Todos os alunos</h2>
        <UserTable users={users} loading={loading} onSelect={setSelected} />
      </div>

      {/* User detail modal */}
      {selected && (
        <UserDetailModal user={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
