import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, GraduationCap, Sparkles, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { streamPost, api } from '../lib/api'

/* ── Markdown components ── */
const mdComponents = {
  p:  ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ inline, children }) =>
    inline
      ? <code className="px-1.5 py-0.5 rounded-md text-[12px] font-mono" style={{ background: 'rgb(var(--s4))' }}>{children}</code>
      : <pre className="p-3 rounded-xl text-[12px] font-mono overflow-x-auto mb-2" style={{ background: 'rgb(var(--s1))', border: '1px solid rgb(255 255 255 / 0.06)' }}><code>{children}</code></pre>,
  blockquote: ({ children }) => (
    <blockquote className="pl-4 my-2 text-ink-2 italic" style={{ borderLeft: '2px solid rgb(var(--accent-rgb) / 0.4)' }}>
      {children}
    </blockquote>
  ),
}

/* ── Message Bubble ── */
function MessageBubble({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end animate-fade-in">
        <div
          className="max-w-[70%] px-4 py-3 rounded-2xl rounded-br-md text-[14px] leading-relaxed text-white whitespace-pre-wrap"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--accent-rgb)), rgb(var(--accent-rgb) / 0.85))',
          }}
        >
          {msg.text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start gap-3 animate-fade-in">
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-1"
        style={{
          background: 'rgb(var(--accent-rgb) / 0.12)',
        }}
      >
        <GraduationCap size={14} className="text-accent" />
      </div>
      <div className="max-w-[75%] min-w-0">
        <div
          className={`px-4 py-3 rounded-2xl rounded-tl-md text-[14px] leading-relaxed ${
            msg.error ? 'text-error' : 'text-ink-2'
          }`}
          style={{
            background: msg.error ? 'rgb(239 68 68 / 0.06)' : 'rgb(var(--s2))',
            border: msg.error ? '1px solid rgb(239 68 68 / 0.15)' : '1px solid rgb(255 255 255 / 0.06)',
          }}
        >
          {msg.streaming || msg.error ? (
            <span className="whitespace-pre-wrap">{msg.text}{msg.streaming ? '▍' : ''}</span>
          ) : (
            <ReactMarkdown components={mdComponents}>{msg.text}</ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Typing Indicator ── */
function TypingIndicator() {
  return (
    <div className="flex justify-start gap-3 animate-fade-in">
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-1"
        style={{ background: 'rgb(var(--accent-rgb) / 0.12)' }}
      >
        <GraduationCap size={14} className="text-accent" />
      </div>
      <div
        className="px-4 py-3.5 rounded-2xl rounded-tl-md flex items-center gap-1.5"
        style={{ background: 'rgb(var(--s2))', border: '1px solid rgb(255 255 255 / 0.06)' }}
      >
        <span className="w-1.5 h-1.5 bg-ink-3 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-ink-3 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-ink-3 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}

/* ── Suggestion Chips ── */
const SUGGESTIONS = [
  'Explica o que cai de Matemática no ENEM',
  'Me dá 3 dicas para redação nota 1000',
  'Quais temas de Biologia mais caem?',
  'Como estudar Física de forma eficiente?',
]

function SuggestionChips({ onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {SUGGESTIONS.map(s => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className="px-3.5 py-2 rounded-xl text-[13px] text-ink-2 font-medium transition-all duration-200 hover:text-ink"
          style={{
            background: 'rgb(var(--s2))',
            border: '1px solid rgb(255 255 255 / 0.06)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgb(var(--accent-rgb) / 0.3)'
            e.currentTarget.style.background = 'rgb(var(--accent-rgb) / 0.06)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgb(255 255 255 / 0.06)'
            e.currentTarget.style.background = 'rgb(var(--s2))'
          }}
        >
          {s}
        </button>
      ))}
    </div>
  )
}

/* ── Main Page ── */
export default function Tutor() {
  const [msgs,    setMsgs]    = useState([])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const msgsEndRef = useRef(null)
  const inputRef   = useRef(null)

  // Auto-scroll
  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, loading])

  // Auto-focus input
  useEffect(() => { inputRef.current?.focus() }, [])

  // Send message
  const send = useCallback(async (text) => {
    if (!text?.trim() || loading) return
    const msg = text.trim()
    setInput('')
    setMsgs(m => [...m, { role: 'user', text: msg }])
    setLoading(true)

    try {
      let streamingIdx = null

      for await (const ev of streamPost('/api/chat', { message: msg })) {
        if (ev.error) throw new Error(ev.error)

        if (ev.text !== undefined) {
          if (streamingIdx === null) {
            setLoading(false)
            setMsgs(m => {
              streamingIdx = m.length
              return [...m, { role: 'assistant', text: ev.text, streaming: true }]
            })
          } else {
            setMsgs(m => m.map((msg, i) =>
              i === streamingIdx ? { ...msg, text: msg.text + ev.text } : msg
            ))
          }
        }

        if (ev.done) {
          setMsgs(m => m.map((msg, i) =>
            i === streamingIdx ? { ...msg, streaming: false } : msg
          ))
        }
      }

      if (streamingIdx === null) {
        setMsgs(m => [...m, { role: 'assistant', text: '(sem resposta)' }])
      }
    } catch (err) {
      setMsgs(m => [...m, { role: 'assistant', text: `Erro: ${err.message}`, error: true }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [loading])

  function handleSubmit(e) {
    e.preventDefault()
    send(input)
  }

  function clearChat() {
    if (loading) return
    setMsgs([])
  }

  const hasMessages = msgs.length > 0

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -mt-2 animate-fade-in">
      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--accent-rgb) / 0.15), rgb(var(--accent-rgb) / 0.05))',
                border: '1px solid rgb(var(--accent-rgb) / 0.15)',
                boxShadow: '0 0 32px -4px rgb(var(--accent-rgb) / 0.15)',
              }}
            >
              <Sparkles size={28} className="text-accent" />
            </div>
            <div className="text-center max-w-md">
              <h1 className="font-heading text-2xl font-bold text-ink tracking-tight">
                Prof. ENEM
              </h1>
              <p className="text-[14px] text-ink-3 mt-2 leading-relaxed">
                Seu tutor de IA para o ENEM. Tire dúvidas, peça explicações ou treine com questões.
              </p>
            </div>
            <SuggestionChips onSelect={send} />
          </div>
        ) : (
          /* ── Message list ── */
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
            {msgs.map((m, i) => (
              <MessageBubble key={i} msg={m} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={msgsEndRef} />
          </div>
        )}
      </div>

      {/* ── Input bar ── */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <div className="max-w-3xl mx-auto">
          {hasMessages && (
            <div className="flex justify-center mb-3">
              <button
                onClick={clearChat}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-ink-4 hover:text-ink-3 transition-colors duration-200 disabled:opacity-30"
              >
                <Trash2 size={12} />
                Limpar conversa
              </button>
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-3 p-2 rounded-2xl transition-all duration-200"
            style={{
              background: 'rgb(var(--s2) / 0.7)',
              border: '1px solid rgb(255 255 255 / 0.08)',
              backdropFilter: 'blur(8px)',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'rgb(var(--accent-rgb) / 0.3)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgb(var(--accent-rgb) / 0.08)'
            }}
            onBlur={e => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                e.currentTarget.style.borderColor = 'rgb(255 255 255 / 0.08)'
                e.currentTarget.style.boxShadow = 'none'
              }
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pergunte algo ao Prof. ENEM..."
              className="flex-1 bg-transparent px-3 py-3 text-[14px] text-ink placeholder:text-ink-4 focus:outline-none"
              disabled={loading}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30"
              style={{
                background: input.trim()
                  ? 'linear-gradient(135deg, rgb(var(--accent-rgb)), rgb(var(--accent-rgb) / 0.8))'
                  : 'rgb(var(--s3))',
                color: input.trim() ? 'white' : 'rgb(var(--ink4-rgb))',
                boxShadow: input.trim() ? '0 2px 12px rgb(var(--accent-rgb) / 0.3)' : 'none',
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
          <p className="text-center text-[11px] text-ink-4 mt-2.5">
            O Prof. ENEM pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </div>
    </div>
  )
}
