import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, XCircle, Star, ImageOff, GraduationCap, Minus } from 'lucide-react'
import { api } from '../lib/api'
import QuestionChat from './QuestionChat'
import { renderWithHighlights } from '../lib/renderHighlights'

// ─── Popup flutuante de seleção de texto ──────────────────────────────────────

function SelectionPopup({ rect, onAsk }) {
  return (
    <div
      data-tutor-popup="true"
      style={{
        position: 'fixed',
        left: rect.left + rect.width / 2,
        top: rect.top - 8,
        transform: 'translate(-50%, -100%)',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
    >
      <button
        onMouseDown={e => e.preventDefault()}
        onClick={onAsk}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold animate-scale-in whitespace-nowrap transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--accent-rgb)), rgb(var(--accent-rgb) / 0.8))',
          boxShadow: '0 4px 20px -2px rgb(var(--accent-rgb) / 0.4), 0 8px 24px -4px rgb(0 0 0 / 0.3)',
        }}
      >
        <GraduationCap size={12} />
        Perguntar ao Tutor
      </button>
      <div
        style={{
          width: 0, height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid rgb(var(--accent-rgb))',
          margin: '0 auto',
        }}
      />
    </div>
  )
}

// ─── Alternativas ─────────────────────────────────────────────────────────────

function OptionButton({ letter, text, state, onClick }) {
  const base = 'w-full flex items-start gap-3 p-3.5 rounded-xl text-left transition-all duration-200'

  const styles = {
    idle:            `${base} cursor-pointer hover:bg-white/[0.04]`,
    selected:        `${base} cursor-pointer`,
    correct:         `${base}`,
    wrong:           `${base}`,
    'reveal-correct': `${base} opacity-60`,
  }

  const borderStyles = {
    idle:            '1px solid rgb(255 255 255 / 0.06)',
    selected:        '1px solid rgb(var(--accent-rgb) / 0.4)',
    correct:         '1px solid rgb(34 197 94 / 0.4)',
    wrong:           '1px solid rgb(239 68 68 / 0.4)',
    'reveal-correct': '1px solid rgb(34 197 94 / 0.2)',
  }

  const bgStyles = {
    idle:            'transparent',
    selected:        'rgb(var(--accent-rgb) / 0.06)',
    correct:         'rgb(34 197 94 / 0.06)',
    wrong:           'rgb(239 68 68 / 0.06)',
    'reveal-correct': 'rgb(34 197 94 / 0.03)',
  }

  const letterCls = {
    idle:            'bg-white/[0.06] text-ink-3',
    selected:        'text-accent',
    correct:         'text-success',
    wrong:           'text-error',
    'reveal-correct': 'text-success/60',
  }

  const letterBg = {
    idle:            'rgb(255 255 255 / 0.06)',
    selected:        'rgb(var(--accent-rgb) / 0.15)',
    correct:         'rgb(34 197 94 / 0.15)',
    wrong:           'rgb(239 68 68 / 0.15)',
    'reveal-correct': 'rgb(34 197 94 / 0.1)',
  }

  const shadowStyles = {
    idle:            'none',
    selected:        '0 0 16px -4px rgb(var(--accent-rgb) / 0.2)',
    correct:         '0 0 16px -4px rgb(34 197 94 / 0.2)',
    wrong:           '0 0 16px -4px rgb(239 68 68 / 0.2)',
    'reveal-correct': 'none',
  }

  return (
    <button
      onClick={onClick}
      disabled={state !== 'idle' && state !== 'selected'}
      className={styles[state]}
      style={{
        border: borderStyles[state],
        background: bgStyles[state],
        boxShadow: shadowStyles[state],
      }}
    >
      <span
        className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all duration-200 ${letterCls[state]}`}
        style={{ background: letterBg[state] }}
      >
        {letter}
      </span>
      <span className={`leading-relaxed mt-0.5 transition-colors ${
        state === 'correct'        ? 'text-success font-medium' :
        state === 'wrong'          ? 'text-error' :
        state === 'reveal-correct' ? 'text-success/70' :
        'text-ink-2'
      }`} style={{ fontFamily: 'Arial, sans-serif', fontSize: '15px' }}>{text}</span>
      {state === 'correct'        && <CheckCircle2 size={16} className="shrink-0 ml-auto mt-0.5 text-success" />}
      {state === 'wrong'          && <XCircle      size={16} className="shrink-0 ml-auto mt-0.5 text-error" />}
      {state === 'reveal-correct' && <CheckCircle2 size={16} className="shrink-0 ml-auto mt-0.5 text-success/50" />}
    </button>
  )
}

// ─── QuestionCard ─────────────────────────────────────────────────────────────

export default function QuestionCard({ question, index, previousAnswer }) {
  const [chosen,    setChosen]    = useState(previousAnswer?.answer_given ?? null)
  const [submitted, setSubmitted] = useState(!!previousAnswer)
  const [saving,    setSaving]    = useState(false)
  const [favorite,  setFavorite]  = useState(false)
  const [imgError,  setImgError]  = useState(false)

  // ── Seleção de texto → grifo amarelo + Perguntar ao Tutor ──
  const statementRef   = useRef(null)
  const [selPopup,         setSelPopup]         = useState(null)
  const [selectionContext, setSelectionContext]  = useState(null)
  const [highlights,       setHighlights]        = useState([])
  const highlightsRef = useRef([])
  useEffect(() => { highlightsRef.current = highlights }, [highlights])

  useEffect(() => {
    function onMouseUp() {
      setTimeout(() => {
        const sel = window.getSelection()
        const text = sel?.toString().trim()
        if (!text || !statementRef.current?.contains(sel.anchorNode)) return
        const rect = sel.getRangeAt(0).getBoundingClientRect()

        if (highlightsRef.current.includes(text)) {
          setHighlights(h => h.filter(t => t !== text))
          window.getSelection()?.removeAllRanges()
        } else {
          setHighlights(h => [...h, text])
          setSelPopup({ rect, text })
        }
      }, 10)
    }

    function onMouseDown(e) {
      if (e.target.closest('[data-tutor-popup]')) return
      setSelPopup(null)
    }

    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [])

  function handlePopupAsk() {
    if (!selPopup) return
    setSelectionContext({ text: selPopup.text, id: Date.now() })
    setSelPopup(null)
    window.getSelection()?.removeAllRanges()
  }

  // ── Lógica da questão ──
  const correct   = question.correct_letter?.trim()
  const isCorrect = submitted && chosen === correct
  const options   = [...(question.options ?? [])].sort((a, b) => a.letter.localeCompare(b.letter))

  function getOptionState(letter) {
    if (!submitted) return chosen === letter ? 'selected' : 'idle'
    if (letter === correct) return 'correct'
    if (letter === chosen && chosen !== correct) return 'wrong'
    return 'reveal-correct'
  }

  async function handleSubmit() {
    if (!chosen || submitted || saving) return
    setSaving(true)
    try {
      await api.post('/api/answers', { question_id: question.id, answer_given: chosen })
    } catch { /* ignorado */ }
    finally { setSaving(false); setSubmitted(true) }
  }

  async function toggleFavorite() {
    try {
      if (favorite) { await api.delete(`/api/favorites/${question.id}`); setFavorite(false) }
      else          { await api.post(`/api/favorites/${question.id}`);   setFavorite(true) }
    } catch {}
  }

  return (
    <article
      className="card transition-all duration-300 animate-fade-in"
      style={submitted ? {
        borderColor: isCorrect ? 'rgb(34 197 94 / 0.2)' : 'rgb(239 68 68 / 0.2)',
        boxShadow: isCorrect
          ? '0 0 24px -8px rgb(34 197 94 / 0.08)'
          : '0 0 24px -8px rgb(239 68 68 / 0.08)',
      } : undefined}
    >

      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div
          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300"
          style={
            submitted
              ? isCorrect
                ? { background: 'rgb(34 197 94 / 0.12)', color: '#22c55e' }
                : { background: 'rgb(239 68 68 / 0.12)', color: '#ef4444' }
              : { background: 'rgb(255 255 255 / 0.06)', color: 'rgb(var(--ink3-rgb))' }
          }
        >
          {submitted
            ? isCorrect ? <CheckCircle2 size={15} /> : <XCircle size={15} />
            : index
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {question.subject_area && (
              <span className="badge text-accent text-[11px]" style={{ background: 'rgb(var(--accent-rgb) / 0.1)' }}>
                {question.subject_area}
              </span>
            )}
            {question.topic && (
              <span className="badge text-ink-3 text-[11px]" style={{ background: 'rgb(var(--s3))' }}>
                {question.topic}
              </span>
            )}
            <span className="badge text-ink-4 text-[11px] ml-auto font-mono" style={{ background: 'rgb(var(--s3))' }}>
              {question.question_id || `${question.vestibular} ${question.year}`}
            </span>
          </div>
        </div>
        <button
          onClick={toggleFavorite}
          className={`shrink-0 p-2 rounded-xl transition-all duration-200 ${
            favorite
              ? 'text-warning'
              : 'text-ink-4 hover:text-warning hover:bg-warning/8'
          }`}
          style={favorite ? { transform: 'scale(1.1)' } : undefined}
          title={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Enunciado */}
      <div className="mb-5" ref={statementRef}>
        <p className="text-ink-2 leading-relaxed whitespace-pre-wrap select-text" style={{ fontFamily: 'Arial, sans-serif', fontSize: '15px' }}>
          {renderWithHighlights(question.statement, highlights)}
        </p>
      </div>

      {/* Popup */}
      {selPopup && <SelectionPopup rect={selPopup.rect} onAsk={handlePopupAsk} />}

      {/* Imagem */}
      {question.image_url && !imgError && (
        <div className="mb-5 rounded-xl overflow-hidden" style={{ border: '1px solid rgb(255 255 255 / 0.06)', background: 'rgb(var(--s3))' }}>
          <img
            src={question.image_url}
            alt="Imagem da questão"
            className="max-w-full max-h-80 mx-auto object-contain"
            onError={() => setImgError(true)}
          />
        </div>
      )}
      {question.image_url && imgError && (
        <div className="mb-5 flex items-center gap-2 px-4 py-3.5 rounded-xl text-ink-3 text-xs"
             style={{ background: 'rgb(var(--s3))', border: '1px solid rgb(255 255 255 / 0.06)' }}>
          <ImageOff size={15} /> Imagem indisponível
        </div>
      )}

      {/* Alternativas */}
      <div className="space-y-2 mb-5">
        {options.map(opt => (
          <OptionButton
            key={opt.letter}
            letter={opt.letter}
            text={opt.text?.replace(/^[a-e]\)\s*/i, '')}
            state={getOptionState(opt.letter)}
            onClick={() => { if (!submitted) setChosen(opt.letter) }}
          />
        ))}
      </div>

      {/* Confirmar / Resultado */}
      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!chosen || saving}
          className="btn-primary w-full"
        >
          {saving ? 'Salvando...' : 'Confirmar resposta'}
        </button>
      ) : (
        <div className="space-y-3 animate-slide-up">
          {/* Result badge */}
          <div
            className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-sm font-semibold"
            style={isCorrect ? {
              background: 'rgb(34 197 94 / 0.06)',
              border: '1px solid rgb(34 197 94 / 0.2)',
              color: '#22c55e',
            } : {
              background: 'rgb(239 68 68 / 0.06)',
              border: '1px solid rgb(239 68 68 / 0.2)',
              color: '#ef4444',
            }}
          >
            {isCorrect
              ? <><CheckCircle2 size={16} /><span>Correto!</span></>
              : <><XCircle size={16} /><span>Resposta incorreta</span></>
            }
          </div>

          {/* Resolution panel */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgb(255 255 255 / 0.06)', background: 'rgb(var(--s2) / 0.5)' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid rgb(255 255 255 / 0.04)', background: 'rgb(var(--s3) / 0.5)' }}>
              <p className="label">Resolução</p>
            </div>

            <div className="p-5 space-y-3">
              {/* Gabarito oficial */}
              <div className="p-3.5 rounded-xl" style={{ background: 'rgb(var(--s1))', border: '1px solid rgb(255 255 255 / 0.04)' }}>
                <p className="text-[11px] text-ink-4 mb-2 font-medium uppercase tracking-wider">Gabarito oficial</p>
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold text-emerald-400 shrink-0"
                        style={{ background: 'rgb(34 197 94 / 0.12)', border: '1px solid rgb(34 197 94 / 0.2)' }}>
                    {correct}
                  </span>
                  <span className="text-[13px] text-ink-2 leading-relaxed">
                    {question.options?.find(o => o.letter === correct)?.text ?? ''}
                  </span>
                </div>
              </div>

              {/* Resposta do aluno */}
              {!isCorrect && chosen && (
                <div className="p-3.5 rounded-xl" style={{ background: 'rgb(var(--s1))', border: '1px solid rgb(255 255 255 / 0.04)' }}>
                  <p className="text-[11px] text-ink-4 mb-2 font-medium uppercase tracking-wider">Sua resposta</p>
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold text-rose-400 shrink-0"
                          style={{ background: 'rgb(239 68 68 / 0.12)', border: '1px solid rgb(239 68 68 / 0.2)' }}>
                      {chosen}
                    </span>
                    <span className="text-[13px] text-ink-2 leading-relaxed">
                      {question.options?.find(o => o.letter === chosen)?.text ?? ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Explicação */}
              {question.explanation ? (
                <div className="p-3.5 rounded-xl" style={{ background: 'rgb(var(--s1))', border: '1px solid rgb(255 255 255 / 0.04)' }}>
                  <p className="text-[11px] text-ink-4 mb-1.5 font-medium uppercase tracking-wider">Explicação</p>
                  <p className="text-[13px] text-ink-2 leading-relaxed">{question.explanation}</p>
                </div>
              ) : (
                <div className="p-5 rounded-xl flex flex-col items-center gap-2.5 text-center"
                     style={{ background: 'rgb(var(--s1))', border: '1px dashed rgb(255 255 255 / 0.08)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                       style={{ background: 'rgb(var(--s3))' }}>
                    <span className="text-lg">🚧</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-2">Resolução em construção</p>
                    <p className="text-[11px] text-ink-4 mt-0.5">Em breve terá acesso à resolução detalhada.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat do Tutor */}
      <QuestionChat
        key={question.id}
        question={question}
        userAnswer={chosen}
        isCorrect={isCorrect}
        selectionContext={selectionContext}
      />
    </article>
  )
}
