import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, GraduationCap, GripHorizontal, MessageSquare, History } from 'lucide-react'
import { streamPost, api } from '../lib/api'

export default function TutorChat({ open, onClose }) {
  // ── Chat state ──
  const [msgs,     setMsgs]     = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // ── Window state ──
  const [pos,      setPos]      = useState({ x: 24, y: 24 })
  const [size,     setSize]     = useState({ w: 380, h: 420 })
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const dragStart   = useRef(null)
  const resizeStart = useRef(null)

  // ── Tab state ──
  const [tab, setTab] = useState('chat') // 'chat' | 'history'
  const [history,     setHistory]     = useState(null)  // { messages, updatedAt } | null
  const [histLoading, setHistLoading] = useState(false)

  // ── Refs ──
  const msgsRef  = useRef(null)  // container das mensagens — scroll direto
  const histRef  = useRef(null)  // container do histórico
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  // Scroll automático para o fim — usa scrollTop direto (evita rolar a página)
  useEffect(() => {
    const el = msgsRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs])

  // ── Drag ──
  function onMouseDown(e) {
    setDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
  }
  useEffect(() => {
    if (!dragging) return
    const move = e => setPos({
      x: dragStart.current.px - (e.clientX - dragStart.current.mx),
      y: dragStart.current.py - (e.clientY - dragStart.current.my),
    })
    const up = () => setDragging(false)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [dragging])

  // ── Resize (lower-left handle — anchored bottom-right) ──
  function onResizeMouseDown(e) {
    e.stopPropagation()
    setResizing(true)
    resizeStart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h }
  }
  useEffect(() => {
    if (!resizing) return
    const move = e => {
      const dx = e.clientX - resizeStart.current.mx
      const dy = e.clientY - resizeStart.current.my
      setSize({
        w: Math.min(700, Math.max(300, resizeStart.current.w - dx)),
        h: Math.min(700, Math.max(300, resizeStart.current.h - dy)),
      })
    }
    const up = () => setResizing(false)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [resizing])

  // ── Histórico ──
  async function loadHistory() {
    setHistLoading(true)
    try {
      const data = await api.get('/api/chat/history')
      setHistory(data)
      // Scroll para o fim do histórico após render
      setTimeout(() => {
        const el = histRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 80)
    } catch {
      setHistory({ messages: [], updatedAt: null })
    } finally {
      setHistLoading(false)
    }
  }

  function switchTab(t) {
    setTab(t)
    if (t === 'history') loadHistory() // sempre recarrega ao abrir
    if (t === 'chat') setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── Envio de mensagem ──
  async function send(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setMsgs(m => [...m, { role: 'user', text }])
    setLoading(true)
    try {
      let streamingIdx = null

      for await (const ev of streamPost('/api/chat', { message: text })) {
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
      setMsgs(m => [...m, { role: 'assistant', text: `⚠️ ${err.message}`, error: true }])
    } finally { setLoading(false) }
  }

  if (!open) return null

  const updatedLabel = history?.updatedAt
    ? new Date(history.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div
      className="fixed z-50 flex flex-col rounded-2xl border border-surface-5 bg-surface-2 shadow-2xl shadow-black/60 overflow-hidden animate-scale-in"
      style={{ right: pos.x, bottom: pos.y, width: size.w, maxWidth: 'calc(100vw - 48px)' }}
    >
      {/* Header — drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center gap-2.5 px-4 py-3 border-b border-surface-4/60 bg-surface-3 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
      >
        <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
          <GraduationCap size={15} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">Prof. ENEM</p>
          <p className="text-xs text-ink-3">Tutor de IA</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 bg-surface-2 rounded-lg p-0.5">
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => switchTab('chat')}
            title="Chat"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              tab === 'chat' ? 'bg-surface-4 text-ink' : 'text-ink-4 hover:text-ink'
            }`}
          >
            <MessageSquare size={12} />
            Chat
          </button>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => switchTab('history')}
            title="Histórico"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              tab === 'history' ? 'bg-surface-4 text-ink' : 'text-ink-4 hover:text-ink'
            }`}
          >
            <History size={12} />
            Histórico
          </button>
        </div>

        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          className="text-ink-4 hover:text-ink p-1 rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Aba: Chat ── */}
      {tab === 'chat' && (
        <>
          <div
            ref={msgsRef}
            className="overflow-y-auto p-4 space-y-3 flex-shrink-0"
            style={{ height: size.h }}
          >
            {msgs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center">
                  <GraduationCap size={22} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">Olá! Sou o Prof. ENEM.</p>
                  <p className="text-xs text-ink-3 mt-1">Peça questões, tire dúvidas ou peça explicações.</p>
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
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
          </div>

          {/* Input */}
          <form onSubmit={send} className="p-3 border-t border-surface-4/60 flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pergunte algo..."
              className="input flex-1 py-2 text-sm"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn-primary px-3 py-2">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </form>
        </>
      )}

      {/* ── Aba: Histórico ── */}
      {tab === 'history' && (
        <div
          ref={histRef}
          className="overflow-y-auto p-4 flex-shrink-0"
          style={{ height: size.h + 56 /* inclui altura do input */ }}
        >
          {histLoading && (
            <div className="flex items-center justify-center h-full gap-2 text-ink-3 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Carregando histórico...
            </div>
          )}

          {!histLoading && history && history.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
              <History size={28} className="text-ink-4" />
              <p className="text-sm text-ink-3">Nenhuma conversa anterior.</p>
            </div>
          )}

          {!histLoading && history && history.messages.length > 0 && (
            <div className="space-y-3">
              {updatedLabel && (
                <p className="text-xs text-ink-4 text-center pb-1">
                  Última atividade: {updatedLabel}
                </p>
              )}
              {history.messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                    ${m.role === 'user'
                      ? 'bg-accent/70 text-white rounded-br-sm'
                      : 'bg-surface-3 text-ink-2 rounded-bl-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resize handle — lower-left corner */}
      <div
        onMouseDown={onResizeMouseDown}
        className="absolute bottom-0 left-0 w-6 h-6 flex items-end justify-start p-1 cursor-nesw-resize select-none opacity-40 hover:opacity-80 transition-opacity"
        title="Redimensionar"
      >
        <GripHorizontal size={12} className="text-ink-4 rotate-45" />
      </div>
    </div>
  )
}
