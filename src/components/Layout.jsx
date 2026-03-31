import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LayoutDashboard, BookOpen, BarChart2, CalendarDays, Settings, LogOut, MessageCircle, ChevronLeft, GraduationCap, ShieldAlert } from 'lucide-react'
import TutorChat from './TutorChat'

import { isAdminEmail } from '../App'

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'         },
  { to: '/questoes',   icon: BookOpen,         label: 'Banco de Questões' },
  { to: '/desempenho', icon: BarChart2,         label: 'Desempenho'        },
  { to: '/plano',      icon: CalendarDays,      label: 'Plano de Estudos'  },
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
      {/* Sidebar */}
      <aside className={`flex flex-col shrink-0 border-r border-surface-4/40 bg-surface-1 transition-all duration-200 ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}>
        {/* Brand */}
        <div className={`flex items-center gap-2.5 px-4 h-14 border-b border-surface-4/40 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0 shadow-md shadow-accent/30">
            <GraduationCap size={15} className="text-white" />
          </div>
          {!collapsed && <span className="text-sm font-semibold tracking-tight text-ink truncate">Prof. ENEM</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto px-2">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} title={collapsed ? label : undefined}
              className={({ isActive }) => `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-100 ${isActive ? 'bg-accent/15 text-accent' : 'text-ink-3 hover:text-ink hover:bg-surface-3'} ${collapsed ? 'justify-center' : ''}`}>
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}

          {/* Admin link — only visible to admin user */}
          {isAdmin && (
            <>
              <div className={`my-2 border-t border-surface-4/40 ${collapsed ? 'mx-1' : 'mx-1'}`} />
              <NavLink to="/admin" title={collapsed ? 'Admin' : undefined}
                className={({ isActive }) => `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-100 ${isActive ? 'bg-error/15 text-error' : 'text-error/60 hover:text-error hover:bg-error/10'} ${collapsed ? 'justify-center' : ''}`}>
                <ShieldAlert size={17} className="shrink-0" />
                {!collapsed && <span className="truncate">Admin</span>}
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-surface-4/40 p-2 space-y-1">
          <button onClick={() => setChatOpen(v => !v)} title={collapsed ? 'Chat com Tutor' : undefined}
            className={`btn-ghost w-full text-accent/80 hover:text-accent hover:bg-accent/10 ${collapsed ? 'justify-center px-0' : ''}`}>
            <MessageCircle size={17} />
            {!collapsed && <span className="text-sm">Chat com Tutor</span>}
          </button>

          <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent text-xs font-bold shrink-0">{initials}</div>
            {!collapsed && <div className="flex-1 min-w-0"><p className="text-xs font-medium text-ink truncate">{profile?.display_name ?? 'Aluno'}</p></div>}
            <button onClick={async () => { await signOut(); navigate('/login') }} className="text-ink-4 hover:text-error transition-colors p-1 rounded" title="Sair">
              <LogOut size={14} />
            </button>
          </div>

          <button onClick={() => setCollapsed(v => !v)} className="btn-ghost w-full justify-center text-ink-4" title={collapsed ? 'Expandir' : 'Recolher'}>
            <ChevronLeft size={15} className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8"><Outlet /></div>
      </main>

      <TutorChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
