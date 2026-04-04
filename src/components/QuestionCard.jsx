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
        top: rect.top - 6,
        transform: 'translate(-50%, -100%)',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
    >
      <button
        onMouseDown={e => e.preventDefault()} // mantém a seleção ativa
        onClick={onAsk}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover
          text-white text-xs font-semibold shadow-xl animate-scale-in whitespace-nowrap"
      >
        <GraduationCap size={12} />
        Perguntar ao Tutor
      </button>
      {/* Setinha apontando para a seleção */}
      <div
        style={{
          width: 0, height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid rgb(var(--accent-rgb))',
          margin: '0 auto',
        }}
      />
    </div>
  )
}

// ─── Alternativas ─────────────────────────────────────────────────────────────

function OptionButton({ letter, text, state, onClick }) {
  const styles = {
    idle: 'border-surface-5 bg-surface-3 hover:border-accent/50 hover:bg-accent/5 cursor-pointer',
    selected: 'border-accent/60 bg-accent/10 cursor-pointer',
    correct: 'border-success/60 bg-success/10',
    wrong: 'border-error/60 bg-error/10',
    'reveal-correct': 'border-success/40 bg-success/5',
  }
  const letterStyles = {
    idle: 'bg-surface-4 text-ink-3',
    selected: 'bg-accent/20 text-accent',
    correct: 'bg-success/20 text-success',
    wrong: 'bg-error/20 text-error',
    'reveal-correct': 'bg-success/15 text-success',
  }

  return (
    <button
      onClick={onClick}
      disabled={state !== 'idle' && state !== 'selected'}
      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${styles[state]}`}
    >
      <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${letterStyles[state]}`}>
        {letter}
      </span>
      <span className={`text-sm leading-relaxed mt-0.5 transition-colors ${
        state === 'correct'        ? 'text-success font-medium' :
        state === 'wrong'          ? 'text-error' :
        state === 'reveal-correct' ? 'text-success/80' :
        'text-ink-2'
      }`}>{text}</span>
      {state === 'correct'        && <CheckCircle2 size={16} className="shrink-0 ml-auto mt-0.5 text-success" />}
      {state === 'wrong'          && <XCircle      size={16} className="shrink-0 ml-auto mt-0.5 text-error" />}
      {state === 'reveal-correct' && <CheckCircle2 size={16} className="shrink-0 ml-auto mt-0.5 text-success/60" />}
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
  const [selPopup,         setSelPopup]         = useState(null)  // { rect, text }
  const [selectionContext, setSelectionContext]  = useState(null)  // { text, id }
  const [highlights,       setHighlights]        = useState([])    // trechos grifados
  // Ref para acesso sem stale closure dentro do useEffect
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
          // Toggle: remove o grifo e não mostra popup
          setHighlights(h => h.filter(t => t !== text))
          window.getSelection()?.removeAllRanges()
        } else {
          // Novo grifo: adiciona e mostra popup
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
    } catch { /* ignorado — exibe resultado mesmo assim */ }
    finally { setSaving(false); setSubmitted(true) }
  }

  async function toggleFavorite() {
    try {
      if (favorite) { await api.delete(`/api/favorites/${question.id}`); setFavorite(false) }
      else          { await api.post(`/api/favorites/${question.id}`);   setFavorite(true) }
    } catch {}
  }

  return (
    <article className={`card transition-all duration-300 ${
      submitted
        ? isCorrect
          ? 'border-success/30 shadow-sm shadow-success/5'
          : 'border-error/30 shadow-sm shadow-error/5'
        : 'hover:border-surface-5'
    }`}>

      {/* Header: número + badges + favorito */}
      <div className="flex items-start gap-3 mb-4">
        <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
          ${submitted
            ? isCorrect ? 'bg-success/15 text-success' : 'bg-error/15 text-error'
            : 'bg-surface-4 text-ink-3'
          }`}
        >
          {submitted
            ? isCorrect ? <CheckCircle2 size={15} /> : <XCircle size={15} />
            : index
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {question.subject_area && (
              <span className="badge bg-accent/10 text-accent">{question.subject_area}</span>
            )}
            {question.topic && (
              <span className="badge bg-surface-4 text-ink-3">{question.topic}</span>
            )}
            <span className="badge bg-surface-4 text-ink-4 ml-auto">
              {question.vestibular} {question.year}
            </span>
          </div>
        </div>
        <button
          onClick={toggleFavorite}
          className={`shrink-0 p-1.5 rounded-lg transition-all ${favorite ? 'text-warning' : 'text-ink-4 hover:text-warning'}`}
          title={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Enunciado — seleção gera grifo amarelo (toggle) */}
      <div className="mb-4" ref={statementRef}>
        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap select-text">
          {renderWithHighlights(question.statement, highlights)}
        </p>
      </div>

      {/* Popup flutuante de seleção */}
      {selPopup && <SelectionPopup rect={selPopup.rect} onAsk={handlePopupAsk} />}

      {/* Imagem — entre o enunciado e as alternativas */}
      {question.image_url && !imgError && (
        <div className="mb-4 rounded-xl overflow-hidden border border-surface-5 bg-surface-3">
          <img
            src={question.image_url}
            alt="Imagem da questão"
            className="max-w-full max-h-80 mx-auto object-contain"
            onError={() => setImgError(true)}
          />
        </div>
      )}
      {question.image_url && imgError && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-3 border border-surface-5 text-ink-3 text-xs">
          <ImageOff size={15} /> Imagem indisponível
        </div>
      )}

      {/* Alternativas */}
      <div className="space-y-2 mb-4">
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
          {/* Badge de acerto/erro */}
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
            isCorrect
              ? 'bg-success/8 border-success/25 text-success'
              : 'bg-error/8 border-error/25 text-error'
          }`}>
            {isCorrect
              ? <><CheckCircle2 size={16} /><span className="text-sm font-semibold">Correto! 🎉</span></>
              : <><XCircle size={16} /><span className="text-sm font-semibold">Resposta incorreta</span></>
            }
          </div>

          {/* Painel de resolução — igual ao Simulado */}
          <div className="rounded-xl border border-surface-4 bg-surface-2 overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-4 bg-surface-3">
              <p className="text-xs font-semibold text-ink-4 uppercase tracking-wider">Resolução</p>
            </div>

            <div className="p-4 space-y-3">
              {/* Gabarito oficial */}
              <div className="p-3 rounded-xl bg-surface-1 border border-surface-3">
                <p className="text-xs text-ink-4 mb-2">Gabarito oficial</p>
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-base font-bold text-emerald-400 flex-shrink-0">
                    {correct}
                  </span>
                  <span className="text-sm text-ink-2 leading-relaxed">
                    {question.options?.find(o => o.letter === correct)?.text ?? ''}
                  </span>
                </div>
              </div>

              {/* Resposta do aluno — só se errou */}
              {!isCorrect && chosen && (
                <div className="p-3 rounded-xl bg-surface-1 border border-surface-3">
                  <p className="text-xs text-ink-4 mb-2">Sua resposta</p>
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-base font-bold text-rose-400 flex-shrink-0">
                      {chosen}
                    </span>
                    <span className="text-sm text-ink-2 leading-relaxed">
                      {question.options?.find(o => o.letter === chosen)?.text ?? ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Explicação (se houver) ou placeholder */}
              {question.explanation ? (
                <div className="p-3 rounded-xl bg-surface-1 border border-surface-3">
                  <p className="text-xs text-ink-4 mb-1.5">Explicação</p>
                  <p className="text-sm text-ink-2 leading-relaxed">{question.explanation}</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-surface-1 border border-surface-3 border-dashed flex flex-col items-center gap-2 text-center">
                  <span className="text-2xl">🚧</span>
                  <div>
                    <p className="text-sm font-medium text-ink-2">Resolução em construção</p>
                    <p className="text-xs text-ink-4 mt-0.5">Em breve você terá acesso à resolução detalhada desta questão.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat do Tutor — key garante instância fresca sem histórico anterior */}
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
