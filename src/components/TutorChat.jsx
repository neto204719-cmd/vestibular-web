import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, GraduationCap, GripHorizontal } from 'lucide-react'
import { api } from '../lib/api'

export default function TutorChat({ open, onClose }) {
  const [msgs,     setMsgs]     = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [pos,      setPos]      = useState({ x: 24, y: 24 })
  const [size,     setSize]     = useState({ w: 380, h: 420 })
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const dragStart   = useRef(null)
  const resizeStart = useRef(null)
  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 100) }
  }, [open])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

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

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setMsgs(m => [...m, { role: 'user', text }])
    setLoading(true)
    try {
      const data = await api.post('/api/chat', { message: text })
      setMsgs(m => [...m, { role: 'assistant', text: data.text }])
    } catch (err) {
      setMsgs(m => [...m, { role: 'assistant', text: `⚠️ ${err.message}`, error: true }])
    } finally { setLoading(false) }
  }

  if (!open) return null

  return (
    <div className="fixed z-50 flex flex-col rounded-2xl border border-surface-5 bg-surface-2 shadow-2xl shadow-black/60 overflow-hidden animate-scale-in"
      style={{ right: pos.x, bottom: pos.y, width: size.w, maxWidth: 'calc(100vw - 48px)' }}>
      {/* Header */}
      <div onMouseDown={onMouseDown} className="flex items-center gap-2.5 px-4 py-3 border-b border-surface-4/60 bg-surface-3 cursor-grab active:cursor-grabbing select-none">
        <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
          <GraduationCap size={15} className="text-accent" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">Prof. ENEM</p>
          <p className="text-xs text-ink-3">Tutor de IA</p>
        </div>
        <button onClick={onClose} className="text-ink-4 hover:text-ink p-1 rounded transition-colors"><X size={16} /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0, height: size.h }}>
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8 text-center">
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
              ${m.role === 'user' ? 'bg-accent text-white rounded-br-sm' : m.error ? 'bg-error/10 text-error border border-error/20 rounded-bl-sm' : 'bg-surface-3 text-ink rounded-bl-sm'}`}>
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
        <div ref={bottomRef} />
      </div>

      {/* Resize handle — lower-left corner */}
      <div
        onMouseDown={onResizeMouseDown}
        className="absolute bottom-0 left-0 w-6 h-6 flex items-end justify-start p-1 cursor-nesw-resize select-none opacity-40 hover:opacity-80 transition-opacity"
        title="Redimensionar"
      >
        <GripHorizontal size={12} className="text-ink-4 rotate-45" />
      </div>

      {/* Input */}
      <form onSubmit={send} className="p-3 border-t border-surface-4/60 flex gap-2">
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Pergunte algo..." className="input flex-1 py-2 text-sm" disabled={loading} />
        <button type="submit" disabled={loading || !input.trim()} className="btn-primary px-3 py-2">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </form>
    </div>
  )
}
