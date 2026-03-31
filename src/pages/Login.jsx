import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { BookOpen, ArrowRight, Eye, EyeOff, Loader2, Mail, ChevronLeft } from 'lucide-react'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode,     setMode]     = useState('login') // 'login' | 'signup' | 'forgot'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [success,  setSuccess]  = useState(null)

  function switchMode(next) {
    setMode(next); setError(null); setSuccess(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null); setSuccess(null); setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else if (mode === 'signup') {
        await signUp(email, password, name)
        setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
      } else if (mode === 'forgot') {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/config',
        })
        if (e) throw e
        setSuccess('Link enviado! Verifique seu e-mail e clique no link para redefinir sua senha.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const titles = {
    login:  { heading: 'Bem-vindo de volta',          sub: 'Entre para continuar seus estudos' },
    signup: { heading: 'Criar conta',                 sub: 'Comece a estudar para o ENEM hoje' },
    forgot: { heading: 'Redefinir senha',             sub: 'Enviaremos um link para seu e-mail' },
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-accent/[0.07] blur-[120px]" />
      </div>

      <div className="w-full max-w-sm animate-scale-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/30">
            <BookOpen size={18} className="text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-ink">Prof. ENEM</span>
        </div>

        {/* Card */}
        <div className="bg-surface-2 border border-surface-4/60 rounded-2xl p-8 shadow-2xl shadow-black/40">
          <div className="mb-7">
            <h1 className="text-xl font-semibold text-ink mb-1">{titles[mode].heading}</h1>
            <p className="text-sm text-ink-3">{titles[mode].sub}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5 animate-slide-up">
                <label className="label">Nome</label>
                <input className="input" type="text" placeholder="Seu primeiro nome" value={name} onChange={e => setName(e.target.value)} required autoFocus />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="label">E-mail</label>
              <input className="input" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus={mode !== 'signup'} />
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <label className="label">Senha</label>
                <div className="relative">
                  <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder={mode === 'signup' ? 'Mínimo 8 caracteres' : '••••••••'} value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'signup' ? 8 : undefined} />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 transition-colors" tabIndex={-1}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {error   && <div className="flex items-start gap-2 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm animate-fade-in"><span>⚠</span><span>{error}</span></div>}
            {success && <div className="flex items-start gap-2 p-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm animate-fade-in"><span>✓</span><span>{success}</span></div>}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : mode === 'forgot'
                  ? <><Mail size={16} /> Enviar link de redefinição</>
                  : <>{mode === 'login' ? 'Entrar' : 'Criar conta'}<ArrowRight size={16} /></>
              }
            </button>
          </form>

          {/* Esqueci minha senha — só no modo login */}
          {mode === 'login' && (
            <div className="mt-3 text-center">
              <button onClick={() => switchMode('forgot')} className="text-xs text-ink-4 hover:text-ink-2 transition-colors">
                Esqueci minha senha
              </button>
            </div>
          )}

          {/* Voltar / alternar modo */}
          <p className="mt-5 text-center text-sm text-ink-3">
            {mode === 'forgot' ? (
              <button onClick={() => switchMode('login')} className="flex items-center gap-1 mx-auto text-accent hover:text-accent-hover font-medium transition-colors">
                <ChevronLeft size={14} /> Voltar ao login
              </button>
            ) : (
              <>
                {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
                <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className="text-accent hover:text-accent-hover font-medium transition-colors">
                  {mode === 'login' ? 'Criar conta' : 'Entrar'}
                </button>
              </>
            )}
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-ink-4">Tutor de IA para o ENEM · WhatsApp · Telegram · Web</p>
      </div>
    </div>
  )
}
