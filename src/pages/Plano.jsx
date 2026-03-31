import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Plus, Check, Play, Trash2,
  Calendar, List, LayoutGrid, Loader2, BookOpen, X,
  ClipboardList,
} from 'lucide-react'
import { api } from '../lib/api'

// ─── helpers ──────────────────────────────────────────────────────────────────

const SUBJECTS = [
  'Biologia', 'Física', 'Química', 'Matemática',
  'História', 'Geografia', 'Português', 'Redação',
  'Inglês', 'Filosofia', 'Sociologia', 'Artes',
]

const SUBJECT_COLORS = {
  'Biologia':   '#22c55e',  'Física':    '#3b82f6',
  'Química':    '#a855f7',  'Matemática':'#f59e0b',
  'História':   '#ef4444',  'Geografia': '#14b8a6',
  'Português':  '#ec4899',  'Redação':   '#f97316',
  'Inglês':     '#6366f1',  'Filosofia': '#84cc16',
  'Sociologia': '#06b6d4',  'Artes':     '#e879f9',
}

function subjectColor(s) { return SUBJECT_COLORS[s] ?? '#7c6af7' }

function isoDate(d) { return d.toISOString().slice(0, 10) }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }
function startOfWeek(d)  { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); return x }
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

// ─── Add task modal ───────────────────────────────────────────────────────────

function AddTaskModal({ date, onSave, onClose }) {
  const [subject,  setSubject]  = useState('')
  const [topic,    setTopic]    = useState('')
  const [count,    setCount]    = useState(10)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!subject) return setError('Selecione uma matéria')
    setSaving(true)
    try {
      const task = await api.post('/api/study-tasks', {
        task_date: date,
        subject_area: subject,
        topic: topic || null,
        question_count: count,
      })
      onSave(task)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface-1 border border-surface-3 rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-surface-3">
          <h3 className="font-semibold text-ink text-sm">Nova tarefa de estudo</h3>
          <p className="text-xs text-ink-4">{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day:'numeric', month:'short' })}</p>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-3 mb-1.5">Matéria *</label>
            <div className="grid grid-cols-3 gap-1.5">
              {SUBJECTS.map(s => (
                <button key={s} type="button" onClick={() => setSubject(s)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all text-left truncate ${
                    subject === s
                      ? 'text-white border-transparent'
                      : 'border-surface-4 text-ink-3 hover:border-surface-5 hover:text-ink'
                  }`}
                  style={subject === s ? { backgroundColor: subjectColor(s), borderColor: subjectColor(s) } : {}}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-3 mb-1.5">Assunto específico (opcional)</label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="Ex: Funções, Cinemática, Células…"
              className="w-full bg-surface-2 border border-surface-4 rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30" />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-3 mb-1.5">Questões: {count}</label>
            <input type="range" min={5} max={40} step={5} value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="w-full accent-[#7c6af7]" />
            <div className="flex justify-between text-[10px] text-ink-4 mt-0.5">
              <span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span><span>35</span><span>40</span>
            </div>
          </div>

          {error && <p className="text-xs text-error">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-surface-4 text-ink-3 text-sm font-medium hover:bg-surface-3 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Task chip (shared) ───────────────────────────────────────────────────────

function TaskChip({ task, onToggle, onDelete, compact = false }) {
  const done = task.status === 'completed'
  const color = subjectColor(task.subject_area)
  return (
    <div className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all group ${
      done ? 'opacity-60 bg-surface-2 border-surface-3' : 'bg-surface-2 border-surface-3 hover:border-surface-4'
    }`}>
      <button onClick={() => onToggle(task)}
        className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
        style={{ borderColor: done ? color : '#3f3f46', backgroundColor: done ? color : 'transparent' }}>
        {done && <Check size={11} className="text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className={`text-xs font-medium truncate ${done ? 'text-ink-4 line-through' : 'text-ink-2'}`}>
            {task.subject_area}
          </span>
        </div>
        {!compact && task.topic && (
          <p className="text-[10px] text-ink-4 truncate mt-0.5 pl-3.5">{task.topic}</p>
        )}
        {!compact && (
          <p className="text-[10px] text-ink-4 pl-3.5">{task.question_count} questões</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!done && !compact && (
          <button onClick={() => onToggle(task, 'start')}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-all"
            title="Ir para as questões">
            <Play size={11} fill="currentColor" />
          </button>
        )}
        <button onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-ink-4 hover:bg-error/10 hover:text-error transition-all">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ─── Monthly view ─────────────────────────────────────────────────────────────

function MonthView({ tasks, month, onNavigate, onAddTask, onToggle, onDelete }) {
  const first = startOfMonth(month)
  const last  = endOfMonth(month)
  const offset = first.getDay()
  const totalCells = Math.ceil((offset + last.getDate()) / 7) * 7
  const today = isoDate(new Date())

  const tasksByDay = {}
  tasks.forEach(t => {
    if (!tasksByDay[t.task_date]) tasksByDay[t.task_date] = []
    tasksByDay[t.task_date].push(t)
  })

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onNavigate(-1)} className="p-2 hover:bg-surface-3 rounded-lg transition-all text-ink-3">
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-sm font-semibold text-ink">
          {MONTHS_PT[month.getMonth()]} {month.getFullYear()}
        </h2>
        <button onClick={() => onNavigate(1)} className="p-2 hover:bg-surface-3 rounded-lg transition-all text-ink-3">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[10px] text-ink-4 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-surface-3 rounded-xl overflow-hidden">
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum = i - offset + 1
          if (dayNum < 1 || dayNum > last.getDate()) {
            return <div key={i} className="bg-surface-1 min-h-[80px]" />
          }
          const d = new Date(month.getFullYear(), month.getMonth(), dayNum)
          const dateStr = isoDate(d)
          const dayTasks = tasksByDay[dateStr] ?? []
          const isToday = dateStr === today
          const intensity = Math.min(dayTasks.length, 4)
          const doneCount = dayTasks.filter(t => t.status === 'completed').length

          return (
            <div key={i} className={`bg-surface-1 min-h-[80px] p-2 group cursor-pointer hover:bg-surface-2 transition-colors relative ${isToday ? 'ring-1 ring-inset ring-accent/40' : ''}`}
              onClick={() => onAddTask(dateStr)}>
              <div className={`text-xs font-semibold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                isToday ? 'bg-accent text-white' : 'text-ink-3'
              }`}>
                {dayNum}
              </div>
              {/* Intensity dots */}
              {intensity > 0 && (
                <div className="flex gap-0.5 flex-wrap mb-1">
                  {dayTasks.slice(0, 3).map((t, ti) => (
                    <span key={ti} className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: subjectColor(t.subject_area), opacity: t.status === 'completed' ? 0.4 : 1 }} />
                  ))}
                  {dayTasks.length > 3 && <span className="text-[8px] text-ink-4">+{dayTasks.length - 3}</span>}
                </div>
              )}
              {/* Progress if has tasks */}
              {dayTasks.length > 0 && (
                <div className="text-[9px] text-ink-4">{doneCount}/{dayTasks.length}</div>
              )}
              {/* Add hint on hover */}
              {dayTasks.length === 0 && (
                <Plus size={10} className="text-ink-4 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Weekly view ──────────────────────────────────────────────────────────────

function WeekView({ tasks, weekStart, onNavigate, onAddTask, onToggle, onDelete }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = isoDate(new Date())

  const tasksByDay = {}
  tasks.forEach(t => {
    if (!tasksByDay[t.task_date]) tasksByDay[t.task_date] = []
    tasksByDay[t.task_date].push(t)
  })

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onNavigate(-7)} className="p-2 hover:bg-surface-3 rounded-lg transition-all text-ink-3">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-semibold text-ink">
            {days[0].getDate()}/{days[0].getMonth() + 1} – {days[6].getDate()}/{days[6].getMonth() + 1}/{days[6].getFullYear()}
          </h2>
        </div>
        <button onClick={() => onNavigate(7)} className="p-2 hover:bg-surface-3 rounded-lg transition-all text-ink-3">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dateStr = isoDate(day)
          const dayTasks = tasksByDay[dateStr] ?? []
          const isToday = dateStr === today
          const totalQ  = dayTasks.reduce((s, t) => s + (t.question_count ?? 0), 0)
          const doneQ   = dayTasks.filter(t => t.status === 'completed').reduce((s, t) => s + (t.question_count ?? 0), 0)

          return (
            <div key={dateStr} className={`flex flex-col rounded-xl border p-2.5 min-h-[120px] ${
              isToday ? 'border-accent/40 bg-accent/5' : 'border-surface-3 bg-surface-2'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[10px] text-ink-4">{DAYS_SHORT[day.getDay()]}</div>
                  <div className={`text-sm font-bold ${isToday ? 'text-accent' : 'text-ink'}`}>{day.getDate()}</div>
                </div>
                <button onClick={() => onAddTask(dateStr)}
                  className="w-6 h-6 rounded-lg bg-surface-3 hover:bg-accent/20 flex items-center justify-center text-ink-4 hover:text-accent transition-all">
                  <Plus size={12} />
                </button>
              </div>

              <div className="flex-1 space-y-1">
                {dayTasks.map(t => (
                  <div key={t.id} onClick={() => onToggle(t)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer text-[10px] transition-all group ${
                      t.status === 'completed' ? 'opacity-50 line-through' : 'hover:bg-surface-3'
                    }`}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: subjectColor(t.subject_area) }} />
                    <span className="text-ink-2 truncate">{t.subject_area}</span>
                    <Trash2 size={9} className="text-ink-4 opacity-0 group-hover:opacity-100 ml-auto shrink-0"
                      onClick={e => { e.stopPropagation(); onDelete(t.id) }} />
                  </div>
                ))}
              </div>

              {totalQ > 0 && (
                <div className="mt-2">
                  <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${Math.round((doneQ / totalQ) * 100)}%` }} />
                  </div>
                  <div className="text-[9px] text-ink-4 mt-0.5 text-right">{doneQ}/{totalQ}q</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Daily view ───────────────────────────────────────────────────────────────

function DayView({ tasks, day, onNavigate, onAddTask, onToggle, onDelete }) {
  const navigate = useNavigate()
  const today = isoDate(new Date())
  const isToday = isoDate(day) === today
  const dayTasks = tasks.filter(t => t.task_date === isoDate(day))
  const done = dayTasks.filter(t => t.status === 'completed').length

  function handleStart(task) {
    navigate(`/questoes?subject_area=${encodeURIComponent(task.subject_area)}&topic=${encodeURIComponent(task.topic ?? '')}`)
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => onNavigate(-1)} className="p-2 hover:bg-surface-3 rounded-lg transition-all text-ink-3">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <div className={`text-2xl font-bold ${isToday ? 'text-accent' : 'text-ink'}`}>
            {day.getDate()}
          </div>
          <div className="text-xs text-ink-4">
            {DAYS_SHORT[day.getDay()]}, {MONTHS_PT[day.getMonth()]}
            {isToday && <span className="ml-1 text-accent">• hoje</span>}
          </div>
        </div>
        <button onClick={() => onNavigate(1)} className="p-2 hover:bg-surface-3 rounded-lg transition-all text-ink-3">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Progress */}
      {dayTasks.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-ink-3">{done} de {dayTasks.length} concluídas</span>
            <span className="text-ink-4">{Math.round((done / dayTasks.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-violet-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.round((done / dayTasks.length) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Task list */}
      {dayTasks.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-3 text-center">
          <Calendar size={24} className="text-ink-4" />
          <p className="text-sm text-ink-3">Nenhuma tarefa para esse dia</p>
          <button onClick={() => onAddTask(isoDate(day))}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
            <Plus size={14} /> Adicionar tarefa
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {dayTasks.map(task => {
            const color = subjectColor(task.subject_area)
            const done  = task.status === 'completed'
            return (
              <div key={task.id} className={`flex items-center gap-3 p-4 rounded-xl border transition-all group ${
                done ? 'bg-surface-2 border-surface-3 opacity-70' : 'bg-surface-2 border-surface-3 hover:border-surface-4'
              }`}>
                {/* Check */}
                <button onClick={() => onToggle(task)}
                  className="shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{ borderColor: done ? color : '#3f3f46', backgroundColor: done ? color : 'transparent' }}>
                  {done && <Check size={12} className="text-white" />}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className={`text-sm font-semibold ${done ? 'line-through text-ink-4' : 'text-ink'}`}>
                      {task.subject_area}
                    </span>
                  </div>
                  {task.topic && <p className="text-xs text-ink-4 mt-0.5 pl-4">{task.topic}</p>}
                  <p className="text-xs text-ink-4 mt-0.5 pl-4">{task.question_count} questões</p>
                </div>

                {/* Progress */}
                {task.completed_count > 0 && (
                  <div className="text-xs text-ink-4 text-right shrink-0">
                    <div>{task.completed_count}/{task.question_count}</div>
                    <div className="w-12 h-1 bg-surface-3 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full rounded-full" style={{ backgroundColor: color, width: `${Math.min(100, (task.completed_count / task.question_count) * 100)}%` }} />
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!done && (
                  <button onClick={() => handleStart(task)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-all">
                    <Play size={12} fill="currentColor" /> Começar
                  </button>
                )}
                <button onClick={() => onDelete(task.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 p-2 rounded-lg text-ink-4 hover:bg-error/10 hover:text-error transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}

          <button onClick={() => onAddTask(isoDate(day))}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-surface-4 text-ink-4 text-xs hover:border-accent/40 hover:text-accent transition-all">
            <Plus size={14} /> Adicionar tarefa
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Plano() {
  const [view,       setView]       = useState('week')  // month|week|day
  const [tasks,      setTasks]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [addModal,   setAddModal]   = useState(null)    // dateStr or null
  const [pivot,      setPivot]      = useState(new Date())  // reference date for navigation

  // ── Date ranges per view ─────────────────────────────────────────────────
  function getRange() {
    if (view === 'month') {
      return { from: isoDate(startOfMonth(pivot)), to: isoDate(endOfMonth(pivot)) }
    }
    if (view === 'week') {
      const ws = startOfWeek(pivot)
      return { from: isoDate(ws), to: isoDate(addDays(ws, 6)) }
    }
    // day: load ±3 days around pivot
    return { from: isoDate(addDays(pivot, -3)), to: isoDate(addDays(pivot, 3)) }
  }

  const loadTasks = useCallback((range) => {
    setLoading(true)
    api.get(`/api/study-tasks?from=${range.from}&to=${range.to}`)
      .then(data => setTasks(data))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadTasks(getRange()) }, [view, pivot])

  // ── Navigate ─────────────────────────────────────────────────────────────
  function navigate(delta) {
    setPivot(prev => {
      if (view === 'month') {
        const d = new Date(prev)
        d.setMonth(d.getMonth() + (delta > 0 ? 1 : -1))
        return d
      }
      return addDays(prev, delta)
    })
  }

  // ── Toggle task status ───────────────────────────────────────────────────
  async function handleToggle(task) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    try {
      const updated = await api.patch(`/api/study-tasks/${task.id}`, { status: newStatus })
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    } catch {}
  }

  // ── Delete task ──────────────────────────────────────────────────────────
  async function handleDelete(id) {
    try {
      await api.delete(`/api/study-tasks/${id}`)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch {}
  }

  // ── Save new task ────────────────────────────────────────────────────────
  function handleSave(task) {
    setTasks(prev => [...prev, task])
    setAddModal(null)
  }

  // ── Stats summary ────────────────────────────────────────────────────────
  const range = getRange()
  const rangeTasks = tasks.filter(t => t.task_date >= range.from && t.task_date <= range.to)
  const totalTasks = rangeTasks.length
  const doneTasks  = rangeTasks.filter(t => t.status === 'completed').length

  const weekStart = startOfWeek(pivot)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Plano de Estudos</h1>
          <p className="text-sm text-ink-3 mt-1">
            {totalTasks > 0
              ? `${doneTasks}/${totalTasks} tarefas concluídas`
              : 'Organize sua rotina de estudos'}
          </p>
        </div>

        {/* View switcher */}
        <div className="flex bg-surface-2 border border-surface-3 rounded-xl p-1 gap-1">
          {[
            { id: 'month', icon: LayoutGrid, label: 'Mensal' },
            { id: 'week',  icon: Calendar,   label: 'Semanal' },
            { id: 'day',   icon: List,        label: 'Diário'  },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === id ? 'bg-accent text-white shadow-sm' : 'text-ink-3 hover:text-ink'
              }`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Global progress bar */}
      {totalTasks > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-violet-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.round((doneTasks / totalTasks) * 100)}%` }} />
          </div>
          <span className="text-xs text-ink-4 tabular-nums shrink-0">{Math.round((doneTasks / totalTasks) * 100)}%</span>
        </div>
      )}

      {/* View content */}
      {loading ? (
        <div className="card flex items-center justify-center py-16">
          <Loader2 size={20} className="text-ink-4 animate-spin" />
        </div>
      ) : view === 'month' ? (
        <MonthView
          tasks={tasks}
          month={pivot}
          onNavigate={navigate}
          onAddTask={setAddModal}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      ) : view === 'week' ? (
        <WeekView
          tasks={tasks}
          weekStart={weekStart}
          onNavigate={navigate}
          onAddTask={setAddModal}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      ) : (
        <DayView
          tasks={tasks}
          day={pivot}
          onNavigate={navigate}
          onAddTask={setAddModal}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      )}

      {/* Add modal */}
      {addModal && (
        <AddTaskModal
          date={addModal}
          onSave={handleSave}
          onClose={() => setAddModal(null)}
        />
      )}
    </div>
  )
}
