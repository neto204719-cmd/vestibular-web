import { useState } from 'react'
import { CheckCircle2, XCircle, Star, StarOff, ImageOff, BookOpen } from 'lucide-react'
import { api } from '../lib/api'
import QuestionChat from './QuestionChat'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

function OptionButton({ letter, text, state, onClick }) {
  // state: 'idle' | 'selected' | 'correct' | 'wrong' | 'reveal-correct'
  const styles = {
    idle:           'border-surface-5 bg-surface-3 hover:border-accent/50 hover:bg-accent/5 cursor-pointer',
    selected:       'border-accent/60 bg-accent/10 cursor-pointer',
    correct:        'border-success/60 bg-success/10',
    wrong:          'border-error/60 bg-error/10',
    'reveal-correct': 'border-success/40 bg-success/5',
  }
  const letterStyles = {
    idle:           'bg-surface-4 text-ink-3',
    selected:       'bg-accent/20 text-accent',
    correct:        'bg-success/20 text-success',
    wrong:          'bg-error/20 text-error',
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
        state === 'correct' ? 'text-success font-medium' :
        state === 'wrong'   ? 'text-error' :
        state === 'reveal-correct' ? 'text-success/80' :
        'text-ink-2'
      }`}>{text}</span>
      {state === 'correct' && <CheckCircle2 size={16} className="shrink-0 ml-auto mt-0.5 text-success" />}
      {state === 'wrong'   && <XCircle      size={16} className="shrink-0 ml-auto mt-0.5 text-error"   />}
      {state === 'reveal-correct' && <CheckCircle2 size={16} className="shrink-0 ml-auto mt-0.5 text-success/60" />}
    </button>
  )
}

export default function QuestionCard({ question, index, previousAnswer }) {
  const [chosen,    setChosen]    = useState(previousAnswer?.answer_given ?? null)
  const [submitted, setSubmitted] = useState(!!previousAnswer)
  const [saving,    setSaving]    = useState(false)
  const [favorite,  setFavorite]  = useState(false)
  const [imgError,  setImgError]  = useState(false)

  const correct   = question.correct_letter?.trim()
  const isCorrect = submitted && chosen === correct

  const options = [...(question.options ?? [])]
    .sort((a, b) => a.letter.localeCompare(b.letter))

  function getOptionState(letter) {
    if (!submitted) return chosen === letter ? 'selected' : 'idle'
    if (letter === correct) return 'correct'
    if (letter === chosen && chosen !== correct) return 'wrong'
    return 'reveal-correct'  // show all correct option subtly
  }

  async function handleSubmit() {
    if (!chosen || submitted || saving) return
    setSaving(true)
    try {
      await api.post('/api/answers', { question_id: question.id, answer_given: chosen })
    } catch { /* silently ignore — still show result */ }
    finally { setSaving(false); setSubmitted(true) }
  }

  async function toggleFavorite() {
    try {
      if (favorite) { await api.delete(`/api/favorites/${question.id}`); setFavorite(false) }
      else          { await api.post(`/api/favorites/${question.id}`);   setFavorite(true)  }
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
      {/* Header */}
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
          {favorite ? <Star size={16} fill="currentColor" /> : <Star size={16} />}
        </button>
      </div>

      {/* Imagem (badges → imagem → enunciado) */}
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

      {/* Enunciado */}
      <div className="mb-5">
        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{question.statement}</p>
      </div>

      {/* Alternativas */}
      <div className="space-y-2 mb-4">
        {options.map(opt => (
          <OptionButton
            key={opt.letter}
            letter={opt.letter}
            text={opt.text}
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
        <div className={`rounded-xl p-4 border animate-slide-up ${
          isCorrect
            ? 'bg-success/8 border-success/25'
            : 'bg-error/8 border-error/25'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {isCorrect
              ? <><CheckCircle2 size={16} className="text-success" /><span className="text-sm font-semibold text-success">Correto! 🎉</span></>
              : <><XCircle      size={16} className="text-error"   /><span className="text-sm font-semibold text-error">Incorreto — gabarito: <strong>{correct}</strong></span></>
            }
          </div>
          {question.explanation && (
            <p className="text-sm text-ink-2 leading-relaxed">{question.explanation}</p>
          )}
          {!question.explanation && !isCorrect && (
            <p className="text-sm text-ink-3">Use o chat abaixo para entender o erro com o tutor.</p>
          )}
        </div>
      )}

      {/* Chat contextual — só aparece após responder */}
      {submitted && (
        <QuestionChat question={question} userAnswer={chosen} isCorrect={isCorrect} />
      )}
    </article>
  )
}
