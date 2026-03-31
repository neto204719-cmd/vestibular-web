import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, ChevronDown, ChevronUp, GraduationCap } from 'lucide-react'
import { api } from '../lib/api'

export default function QuestionChat({ question, userAnswer, isCorrect }) {
  const [open,    setOpen]    = useState(false)
  const [msgs,    setMsgs]    = useState([])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    if (open && msgs.length === 0) {
      // Mensagem inicial contextual
      const ctx = isCorrect
        ? `Acertei a questão de ${question.subject_area ?? question.subject}${question.topic ? ` sobre ${question.topic}` : ''}. Pode me dar uma dica extra ou aprofundar o conceito?`
        : `Errei a questão de ${question.subject_area ?? question.subject}${question.topic ? ` sobre ${question.topic}` : ''}. Marquei ${userAnswer} mas o gabarito era ${question.correct_letter}. Por que errei?`
      setMsgs([{ role: 'user', text: ctx, auto: true }])
      sendMessage(ctx)
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  async function sendMessage(text) {
    setLoading(true)
    const context = `[Contexto da questão]\nMatéria: ${question.subject_area ?? question.subject}\nAssunto: ${question.topic ?? '—'}\nEnunciado: ${question.statement.slice(0, 300)}\nGabarito: ${question.correct_letter}\nResposta do aluno: ${userAnswer}\n\n${text}`
    try {
      const data = await api.post('/api/chat', { message: context })
      setMsgs(m => [...m, { role: 'assistant', text: data.text }])
    } catch (err) {
      setMsgs(m => [...m, { role: 'assistant', text: `⚠️ ${err.message}`, error: true }])
    } finally {
      setLoading(false)
    }
  }

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setMsgs(m => [...m, { role: 'user', text }])
    await sendMessage(text)
  }

  return (
    <div className="mt-4 border border-surface-4/60 rounded-xl overflow-hidden">
      {/* Toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-surface-3 hover:bg-surface-4
          transition-colors text-sm font-medium text-ink-2 hover:text-ink"
      >
        <div className="w-5 h-5 rounded-md bg-accent/20 flex items-center justify-center">
          <GraduationCap size={12} className="text-accent" />
        </div>
        <span className="flex-1 text-left">Conversar com o tutor sobre esta questão</span>
        {open ? <ChevronUp size={15} className="text-ink-4" /> : <ChevronDown size={15} className="text-ink-4" />}
      </button>

      {open && (
        <div className="animate-slide-up">
          {/* Messages */}
          <div className="max-h-[320px] overflow-y-auto p-4 space-y-3 bg-surface-2">
            {msgs.filter(m => !m.auto).length === 0 && !loading && (
              <p className="text-xs text-ink-3 text-center py-2">O tutor vai te ajudar a entender esta questão.</p>
            )}
            {msgs.map((m, i) => (
              !m.auto && (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                    ${m.role === 'user'
                      ? 'bg-accent text-white rounded-br-sm'
                      : m.error
                        ? 'bg-error/10 text-error border border-error/20 rounded-bl-sm'
                        : 'bg-surface-3 text-ink rounded-bl-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              )
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-3 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-ink-3 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-ink-3 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-ink-3 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {!loading && msgs.some(m => m.role === 'assistant') && (
            <div className="px-4 py-2 bg-surface-2 border-t border-surface-4/40 flex gap-2 flex-wrap">
              {[
                !isCorrect && 'Como não errar mais?',
                'Quero outro exemplo',
                'Explica o conceito',
              ].filter(Boolean).map(q => (
                <button key={q} onClick={() => { setMsgs(m => [...m, { role: 'user', text: q }]); sendMessage(q) }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-surface-3 hover:bg-surface-4 text-ink-2 hover:text-ink transition-all border border-surface-5">
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={send} className="flex gap-2 p-3 border-t border-surface-4/60 bg-surface-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pergunte sobre esta questão..."
              className="input flex-1 py-2 text-sm"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn-primary px-3 py-2">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
