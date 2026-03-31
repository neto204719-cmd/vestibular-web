import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import {
  User, Lock, Palette, Bell, Link2, MessageCircle, Phone,
  Check, Loader2, Copy, ExternalLink, Eye, EyeOff, ChevronRight,
  Sun, Moon, Shield, AlertTriangle, CheckCircle,
} from 'lucide-react'
import { THEMES, applyTheme, applyMode } from '../lib/theme.js'

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-surface-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Icon size={15} className="text-accent" />
        </div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-3 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text', disabled, rightElement }) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-surface-2 border border-surface-4 rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-4
          focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30
          disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {rightElement && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>}
    </div>
  )
}

function SaveButton({ loading, saved, onClick, label = 'Salvar' }) {
  return (
    <button onClick={onClick} disabled={loading || saved}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
        saved   ? 'bg-success/10 border border-success/30 text-success' :
        loading ? 'bg-surface-3 text-ink-4 cursor-wait' :
        'bg-accent hover:bg-accent/90 text-white'
      }`}>
      {loading ? <Loader2 size={14} className="animate-spin" /> :
       saved   ? <><Check size={14} /> Salvo!</> : label}
    </button>
  )
}

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection({ profile, onRefresh }) {
  const [name,    setName]    = useState(profile?.display_name ?? '')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => { setName(profile?.display_name ?? '') }, [profile])

  async function save() {
    if (!name.trim()) return setError('Nome não pode ser vazio')
    setSaving(true); setError(null)
    try {
      await api.patch('/api/me', { display_name: name.trim() })
      await onRefresh()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard title="Perfil" icon={User}>
      <div className="space-y-4">
        {/* Avatar placeholder */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center text-accent text-xl font-bold shrink-0">
            {(name || 'A')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-ink">{name || 'Aluno'}</p>
            <p className="text-xs text-ink-4">{profile?.email ?? '—'}</p>
          </div>
        </div>

        <Field label="Nome de exibição">
          <TextInput value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
        </Field>

        <Field label="E-mail">
          <TextInput value={profile?.email ?? ''} disabled placeholder="seu@email.com" />
        </Field>

        {error && <p className="text-xs text-error">{error}</p>}

        <div className="flex justify-end">
          <SaveButton loading={saving} saved={saved} onClick={save} />
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Password section ─────────────────────────────────────────────────────────

function PasswordSection() {
  const [current,    setCurrent]    = useState('')
  const [next,       setNext]       = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [showCur,    setShowCur]    = useState(false)
  const [showNew,    setShowNew]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState(null)

  async function save() {
    if (!next || next.length < 6) return setError('Nova senha deve ter ao menos 6 caracteres')
    if (next !== confirm)         return setError('As senhas não coincidem')
    setSaving(true); setError(null)
    try {
      const { error: e } = await supabase.auth.updateUser({ password: next })
      if (e) throw e
      setSaved(true)
      setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const EyeBtn = ({ show, toggle }) => (
    <button type="button" onClick={toggle} className="text-ink-4 hover:text-ink transition-colors">
      {show ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  )

  return (
    <SectionCard title="Alterar senha" icon={Lock}>
      <div className="space-y-4">
        <Field label="Nova senha">
          <TextInput value={next} onChange={e => setNext(e.target.value)}
            type={showNew ? 'text' : 'password'} placeholder="••••••••"
            rightElement={<EyeBtn show={showNew} toggle={() => setShowNew(v => !v)} />} />
        </Field>
        <Field label="Confirmar nova senha">
          <TextInput value={confirm} onChange={e => setConfirm(e.target.value)}
            type={showNew ? 'text' : 'password'} placeholder="••••••••" />
        </Field>

        {/* Strength bar */}
        {next && (
          <div>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4].map(i => {
                const strength = next.length >= 12 ? 4 : next.length >= 8 ? 3 : next.length >= 6 ? 2 : 1
                const colors = ['', 'bg-error', 'bg-warning', 'bg-warning', 'bg-success']
                return <div key={i} className={`flex-1 h-1 rounded-full ${i <= strength ? colors[strength] : 'bg-surface-3'} transition-all`} />
              })}
            </div>
            <p className="text-[10px] text-ink-4 mt-1">
              {next.length < 6 ? 'Muito fraca' : next.length < 8 ? 'Fraca' : next.length < 12 ? 'Moderada' : 'Forte'}
            </p>
          </div>
        )}

        {error && <p className="text-xs text-error">{error}</p>}

        <div className="flex justify-end">
          <SaveButton loading={saving} saved={saved} onClick={save} label="Alterar senha" />
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Appearance section ───────────────────────────────────────────────────────

function AppearanceSection() {
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('theme') ?? 'violet')
  const [mode,        setMode]        = useState(() => localStorage.getItem('colorMode') ?? 'dark')

  function handleTheme(id) {
    applyTheme(id)        // sets CSS vars + localStorage
    setActiveTheme(id)    // updates local React state for immediate visual feedback
  }

  function handleMode(m) {
    setMode(m)
    applyMode(m)
  }

  return (
    <SectionCard title="Aparência" icon={Palette}>
      <div className="space-y-5">
        {/* Color theme — 3 options */}
        <Field label="Cor de destaque">
          <div className="flex gap-2 mt-1">
            {THEMES.map(t => {
              const isActive = activeTheme === t.id
              return (
                <button key={t.id} onClick={() => handleTheme(t.id)}
                  title={t.label}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex-1 justify-center ${
                    isActive ? 'text-white border-transparent shadow-lg' : 'border-surface-4 text-ink-3 hover:text-ink bg-surface-2 hover:border-surface-5'
                  }`}
                  style={isActive ? { backgroundColor: t.hex, borderColor: t.hex, boxShadow: `0 4px 14px ${t.hex}40` } : {}}>
                  <span className="w-3.5 h-3.5 rounded-full border-2"
                    style={{ backgroundColor: t.hex, borderColor: isActive ? 'rgba(255,255,255,0.5)' : t.hex }} />
                  {t.label}
                  {isActive && <Check size={13} />}
                </button>
              )
            })}
          </div>
        </Field>

        {/* Dark / light */}
        <Field label="Modo de cor">
          <div className="flex gap-2">
            {[
              { id: 'dark',  icon: Moon,  label: 'Escuro' },
              { id: 'light', icon: Sun,   label: 'Claro'  },
            ].map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => handleMode(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex-1 justify-center ${
                  mode === id ? 'bg-accent border-accent text-white' : 'border-surface-4 text-ink-3 hover:border-surface-5 hover:text-ink bg-surface-2'
                }`}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </SectionCard>
  )
}

// ─── Link channel section ─────────────────────────────────────────────────────

function ChannelLinkSection({ channel, icon: Icon, label, instruction, profile }) {
  const [codeData,  setCodeData]  = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [copied,    setCopied]    = useState(false)
  const [error,     setError]     = useState(null)

  const isLinked = channel === 'whatsapp'
    ? !!profile?.whatsapp_phone
    : !!profile?.telegram_id

  async function generateCode() {
    setLoading(true); setError(null)
    try {
      const data = await api.post('/api/link-code', { channel })
      setCodeData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(codeData?.code ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const expiresAt = codeData?.expires_at ? new Date(codeData.expires_at) : null
  const remaining = expiresAt ? Math.max(0, Math.round((expiresAt - Date.now()) / 60000)) : 0

  return (
    <div className="p-4 rounded-xl border border-surface-3 bg-surface-2">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLinked ? 'bg-success/10' : 'bg-surface-3'}`}>
          <Icon size={15} className={isLinked ? 'text-success' : 'text-ink-4'} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink">{label}</span>
            {isLinked && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success border border-success/20 flex items-center gap-1">
                <CheckCircle size={9} /> Vinculado
              </span>
            )}
          </div>
          <p className="text-xs text-ink-4 mt-0.5">{instruction}</p>
        </div>
      </div>

      {!isLinked && !codeData && (
        <button onClick={generateCode} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-medium hover:bg-accent/20 transition-all disabled:opacity-60">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
          Gerar código de vinculação
        </button>
      )}

      {codeData && (
        <div className="space-y-3">
          {/* Code display */}
          <div className="flex items-center gap-2 p-3 bg-surface-3 rounded-xl border border-surface-4">
            <span className="flex-1 text-base font-mono font-bold text-ink tracking-widest">{codeData.code}</span>
            <button onClick={copyCode}
              className={`p-2 rounded-lg transition-all ${copied ? 'bg-success/10 text-success' : 'hover:bg-surface-4 text-ink-3'}`}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>

          <p className="text-xs text-ink-4">
            Expira em ~{remaining} min. Envie este código no {label} para vincular sua conta.
          </p>

          {/* Deep link */}
          {codeData.deep_link && (
            <a href={codeData.deep_link} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-medium transition-all">
              <ExternalLink size={13} /> Abrir {label} e vincular automaticamente
            </a>
          )}

          <button onClick={() => setCodeData(null)}
            className="text-xs text-ink-4 hover:text-ink-3 transition-colors">
            Cancelar
          </button>
        </div>
      )}

      {error && <p className="text-xs text-error mt-2">{error}</p>}
    </div>
  )
}

// ─── Notifications section ────────────────────────────────────────────────────

function ToggleSwitch({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative rounded-full transition-colors duration-200 flex-shrink-0 ${value ? 'bg-accent' : 'bg-surface-4'}`}
      style={{ height: '22px', width: '40px' }}>
      <span
        className="absolute bg-white rounded-full shadow"
        style={{
          width: '18px', height: '18px',
          top: '2px', left: value ? '20px' : '2px',
          transition: 'left 0.2s',
        }}
      />
    </button>
  )
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    daily_reminder: true,
    streak_alert:   true,
    new_content:    false,
  })
  const [saved, setSaved] = useState(false)

  function toggle(key) {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
  }

  function save() {
    localStorage.setItem('notif_prefs', JSON.stringify(prefs))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const items = [
    { key: 'daily_reminder', label: 'Lembrete diário de estudos', sub: 'Notificação às 19h se você ainda não estudou' },
    { key: 'streak_alert',   label: 'Alerta de streak em risco',  sub: 'Avisa quando você pode perder sua sequência' },
    { key: 'new_content',    label: 'Novos conteúdos e recursos', sub: 'Novidades da plataforma e questões novas' },
  ]

  return (
    <SectionCard title="Notificações" icon={Bell}>
      <div className="space-y-4">
        {items.map(({ key, label, sub }) => (
          <div key={key} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-ink">{label}</p>
              <p className="text-xs text-ink-4 mt-0.5">{sub}</p>
            </div>
            <ToggleSwitch value={prefs[key]} onChange={() => toggle(key)} />
          </div>
        ))}
        <div className="flex justify-end pt-1">
          <SaveButton loading={false} saved={saved} onClick={save} label="Salvar preferências" />
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Plan / account section ───────────────────────────────────────────────────

function PlanSection({ profile }) {
  return (
    <SectionCard title="Plano e conta" icon={Shield}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-accent/10 to-violet-500/10 border border-accent/20 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">PRO</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Plano Gratuito</p>
            <p className="text-xs text-ink-4">Acesso a todas as questões e funcionalidades básicas</p>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: 'Membro desde', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '—' },
            { label: 'Email verificado', value: '✓ Verificado' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-surface-3 last:border-0">
              <span className="text-xs text-ink-4">{label}</span>
              <span className="text-xs text-ink-2 font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Config() {
  const { profile, refreshProfile, signOut } = useAuth()
  const [fullProfile, setFullProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/me')
      .then(data => setFullProfile(data))
      .catch(() => setFullProfile(profile))
      .finally(() => setLoading(false))
  }, [])

  async function handleRefresh() {
    await refreshProfile()
    const data = await api.get('/api/me').catch(() => null)
    if (data) setFullProfile(data)
  }

  const p = fullProfile ?? profile

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Configurações</h1>
        <p className="text-sm text-ink-3 mt-1">Personalize sua conta e preferências</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="text-ink-4 animate-spin" />
        </div>
      ) : (
        <>
          <ProfileSection profile={p} onRefresh={handleRefresh} />

          <PasswordSection />

          <AppearanceSection />

          {/* Vincular canais */}
          <SectionCard title="Vincular canais" icon={Link2}>
            <div className="space-y-3">
              <p className="text-xs text-ink-4 -mt-2 mb-1">
                Vincule seu WhatsApp ou Telegram para usar o tutor nos chats e ter seu histórico sincronizado.
              </p>
              <ChannelLinkSection
                channel="whatsapp"
                icon={Phone}
                label="WhatsApp"
                instruction="Envie o código via WhatsApp para o número do tutor"
                profile={p}
              />
              <ChannelLinkSection
                channel="telegram"
                icon={MessageCircle}
                label="Telegram"
                instruction="Envie o código via Telegram para o bot do tutor"
                profile={p}
              />
            </div>
          </SectionCard>

          <NotificationsSection />

          <PlanSection profile={p} />

          {/* Danger zone */}
          <div className="card border-error/20">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={15} className="text-error" />
              <h2 className="text-sm font-semibold text-error">Zona perigosa</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink">Sair da conta</p>
                  <p className="text-xs text-ink-4">Encerra sua sessão atual neste dispositivo</p>
                </div>
                <button onClick={signOut}
                  className="px-4 py-2 rounded-xl border border-surface-4 text-ink-3 text-xs font-medium hover:bg-surface-3 hover:text-ink transition-all">
                  Sair
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
