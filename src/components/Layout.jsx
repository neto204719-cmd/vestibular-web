import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LayoutDashboard, BookOpen, BarChart2, CalendarDays, Settings, LogOut, MessageCircle, ChevronLeft, GraduationCap, ShieldAlert, Sparkles } from 'lucide-react'
import TutorChat from './TutorChat'

import { isAdminEmail } from '../App'

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'         },
  { to: '/questoes',   icon: BookOpen,         label: 'Banco de Questões' },
  { to: '/desempenho', icon: BarChart2,         label: 'Desempenho'        },
  { to: '/plano',      icon: CalendarDays,      label: 'Plano de Estudos'  },
  { to: '/tutor',      icon: Sparkles,          label: 'Tutor'             },
  { to: '/config',     icon: Settings,          label: 'Configurações'     },
]

export default function Layout() {
  const { profile, user, signOut } = useAuth()
  const isAdmin = isAdminEmail(user?.email)
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [chatOpen,  setChatOpen]  = useState(false)

  const initials = (profile?.display_name ?? 'A').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      {/* ── Sidebar ── */}
      <aside
        className={`flex flex-col shrink-0 bg-surface-1/60 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${
          collapsed ? 'w-[60px]' : 'w-[232px]'
        }`}
        style={{ borderRight: '1px solid rgb(255 255 255 / 0.06)' }}
      >
        {/* Brand */}
        <div className={`flex items-center gap-3 px-4 h-16 ${collapsed ? 'justify-center' : ''}`}
             style={{ borderBottom: '1px solid rgb(255 255 255 / 0.04)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
               style={{
                 background: `linear-gradient(135deg, rgb(var(--accent-rgb)), rgb(var(--accent-rgb) / 0.7))`,
                 boxShadow: '0 2px 12px rgb(var(--accent-rgb) / 0.3)',
               }}>
            <GraduationCap size={16} className="text-white" />
          </div>
          {!collapsed && (
            <span className="font-heading text-sm font-bold tracking-tight text-ink">
              Prof. ENEM
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative ${
                  isActive
                    ? 'text-ink bg-white/[0.08]'
                    : 'text-ink-3 hover:text-ink-2 hover:bg-white/[0.04]'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-accent"
                         style={{ boxShadow: '0 0 8px rgb(var(--accent-rgb) / 0.4)' }} />
                  )}
                  <Icon size={17} className={`shrink-0 transition-colors duration-200 ${isActive ? 'text-accent' : ''}`} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}

          {/* Admin link */}
          {isAdmin && (
            <>
              <div className="my-3 mx-2" style={{ borderTop: '1px solid rgb(255 255 255 / 0.04)' }} />
              <NavLink
                to="/admin"
                title={collapsed ? 'Admin' : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-error/10 text-error'
                      : 'text-error/50 hover:text-error/80 hover:bg-error/5'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                <ShieldAlert size={17} className="shrink-0" />
                {!collapsed && <span className="truncate">Admin</span>}
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-2.5 space-y-1" style={{ borderTop: '1px solid rgb(255 255 255 / 0.04)' }}>
          <button
            onClick={() => setChatOpen(v => !v)}
            title={collapsed ? 'Chat com Tutor' : undefined}
            className={`btn-ghost w-full text-accent/70 hover:text-accent hover:bg-accent/8 rounded-xl ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <MessageCircle size={17} />
            {!collapsed && <span className="text-[13px]">Chat com Tutor</span>}
          </button>

          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${collapsed ? 'justify-center' : ''}`}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-200"
              style={{
                background: 'rgb(var(--accent-rgb) / 0.15)',
                border: '1px solid rgb(var(--accent-rgb) / 0.2)',
                color: 'rgb(var(--accent-rgb))',
              }}
            >
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">{profile?.display_name ?? 'Aluno'}</p>
              </div>
            )}
            <button
              onClick={async () => { await signOut(); navigate('/login') }}
              className="text-ink-4 hover:text-error transition-colors duration-200 p-1.5 rounded-lg hover:bg-error/8"
              title="Sair"
            >
              <LogOut size={14} />
            </button>
          </div>

          <button
            onClick={() => setCollapsed(v => !v)}
            className="btn-ghost w-full justify-center text-ink-4 hover:text-ink-3"
            title={collapsed ? 'Expandir' : 'Recolher'}
          >
            <ChevronLeft
              size={15}
              className={`transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${
                collapsed ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-10">
          <Outlet />
        </div>
      </main>

      <TutorChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
