import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, ChevronDown, ChevronUp, GraduationCap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { streamPost } from '../lib/api'

/**
 * QuestionChat — chat com o Tutor sobre uma questão específica.
 *
 * Props:
 *  - question        : objeto da questão (obrigatório)
 *  - userAnswer      : letra escolhida pelo aluno (opcional)
 *  - isCorrect       : se acertou (opcional)
 *  - selectionContext: { text: string, id: number } | null
 *                      Quando definido, auto-abre o chat com o trecho selecionado.
 */
export default function QuestionChat({
  question,
  userAnswer = null,
  isCorrect  = false,
  selectionContext = null,
}) {
  const [open,    setOpen]    = useState(false)
  const [msgs,    setMsgs]    = useState([])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const msgsContainerRef = useRef(null) // scroll interno das mensagens
  const chatHeaderRef    = useRef(null) // scroll-to-chat ao abrir
  const inputRef         = useRef(null)
  // Controla qual selectionContext já foi processado (pelo id)
  const prevSelIdRef = useRef(null)

  // ── Reage ao grifo: abre o chat e preenche o input com o trecho ──
  // Não envia automaticamente — o aluno edita e manda quando quiser.
  useEffect(() => {
    if (!selectionContext) return
    if (selectionContext.id === prevSelIdRef.current) return
    prevSelIdRef.current = selectionContext.id
    setOpen(true)
    // Coloca o trecho entre parênteses no input; preserva o que já estava digitado
    setInput(prev => {
      const insertion = `("${selectionContext.text}")`
      return prev.trim() ? `${prev.trim()} ${insertion}` : insertion
    })
    setTimeout(() => inputRef.current?.focus(), 200)
  }, [selectionContext])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150)
      // Scroll suave até o header do chat — para exatamente no início do componente,
      // sem ultrapassar. block:'nearest' evita scroll desnecessário se já visível.
      setTimeout(() => {
        chatHeaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 80)
    }
  }, [open])

  // Scroll interno das mensagens — apenas dentro do container, sem mover a página
  useEffect(() => {
    const el = msgsContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs])

  async function sendMessage(text) {
    setLoading(true)
    try {
      const answerCtx = userAnswer
        ? `Gabarito: ${question.correct_letter}\nResposta do aluno: ${userAnswer}`
        : ''
      const context = [
        '[Contexto da questão]',
        `Matéria: ${question.subject_area ?? question.subject ?? '—'}`,
        `Assunto: ${question.topic ?? '—'}`,
        `Enunciado: ${question.statement?.slice(0, 400) ?? '(sem enunciado)'}`,
        answerCtx,
        '',
        text,
      ].join('\n')

      let streamingIdx = null // índice da mensagem em streaming

      for await (const ev of streamPost('/api/chat', { message: context, questionId: question.id })) {
        if (ev.error) {
          throw new Error(ev.error)
        }

        if (ev.text !== undefined) {
          // Primeiro chunk: desliga o loading e cria a mensagem placeholder
          if (streamingIdx === null) {
            setLoading(false)
            setMsgs(m => {
              streamingIdx = m.length
              return [...m, { role: 'assistant', text: ev.text, streaming: true }]
            })
          } else {
            // Chunks subsequentes: acumula no mesmo item
            setMsgs(m => m.map((msg, i) =>
              i === streamingIdx ? { ...msg, text: msg.text + ev.text } : msg
            ))
          }
        }

        if (ev.done) {
          // Finaliza — remove a flag streaming
          setMsgs(m => m.map((msg, i) =>
            i === streamingIdx ? { ...msg, streaming: false } : msg
          ))
        }
      }

      // Se nenhum chunk chegou (resposta vazia), garante que loading seja limpo
      if (streamingIdx === null) {
        setMsgs(m => [...m, { role: 'assistant', text: '(sem resposta)' }])
      }
    } catch (err) {
      console.error('[QuestionChat] erro ao chamar /api/chat', err)
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
      {/* Toggle — chatHeaderRef: âncora do scroll ao abrir */}
      <button
        ref={chatHeaderRef}
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-surface-3 hover:bg-surface-4
          transition-colors text-sm font-medium text-ink-2 hover:text-ink"
      >
        <div className="w-5 h-5 rounded-md bg-accent/20 flex items-center justify-center">
          <GraduationCap size={12} className="text-accent" />
        </div>
        <span className="flex-1 text-left">Conversar com o Tutor</span>
        {open ? <ChevronUp size={15} className="text-ink-4" /> : <ChevronDown size={15} className="text-ink-4" />}
      </button>

      {open && (
        <div className="animate-slide-up">
          {/* Mensagens — scroll controlado via msgsContainerRef.scrollTop, sem mover a página */}
          <div ref={msgsContainerRef} className="max-h-[320px] overflow-y-auto p-4 space-y-3 bg-surface-2">
            {msgs.length === 0 && !loading && (
              <p className="text-xs text-ink-3 text-center py-2">Pergunte qualquer coisa sobre esta questão ao Tutor.</p>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                  ${m.role === 'user'
                    ? 'bg-accent text-white rounded-br-sm'
                    : m.error
                      ? 'bg-error/10 text-error border border-error/20 rounded-bl-sm'
                      : 'bg-surface-3 text-ink rounded-bl-sm'
                  }`}
                >
                  {m.role === 'user' ? (
                    <span className="whitespace-pre-wrap">{m.text}</span>
                  ) : (
                    <ReactMarkdown
                      components={{
                        // Parágrafos
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        // Negrito
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        // Itálico
                        em: ({ children }) => <em className="italic">{children}</em>,
                        // Código inline
                        code: ({ inline, children }) => inline
                          ? <code className="px-1 py-0.5 rounded bg-surface-2 text-accent text-xs font-mono">{children}</code>
                          : <code>{children}</code>,
                        // Bloco de código
                        pre: ({ children }) => (
                          <pre className="my-2 p-3 rounded-xl bg-surface-2 text-xs font-mono overflow-x-auto">{children}</pre>
                        ),
                        // Listas não-ordenadas
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                        // Listas ordenadas
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        // Headings
                        h1: ({ children }) => <p className="font-bold text-base mb-1">{children}</p>,
                        h2: ({ children }) => <p className="font-bold mb-1">{children}</p>,
                        h3: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  )}
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

          {/* Sugestões rápidas — aparecem antes da primeira resposta do tutor */}
          {!loading && msgs.length === 0 && (
            <div className="px-4 py-2 bg-surface-2 border-t border-surface-4/40 flex gap-2 flex-wrap">
              {[
                userAnswer && !isCorrect ? 'Por que errei?' : null,
                'Explica o conceito',
                'Quero outro exemplo',
              ].filter(Boolean).map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setMsgs(m => [...m, { role: 'user', text: suggestion }]); sendMessage(suggestion) }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-surface-3 hover:bg-surface-4 text-ink-2 hover:text-ink transition-all border border-surface-5"
                >
                  {suggestion}
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
              placeholder="Pergunte ao Tutor sobre esta questão..."
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
