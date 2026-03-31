import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login      from './pages/Login'
import Layout     from './components/Layout'
import Dashboard  from './pages/Dashboard'
import Questoes   from './pages/Questoes'
import Desempenho from './pages/Desempenho'
import Plano      from './pages/Plano'
import Config     from './pages/Config'
import Admin      from './pages/Admin'

const ADMIN_EMAILS = new Set(
  (import.meta.env.VITE_ADMIN_EMAILS ?? import.meta.env.VITE_ADMIN_EMAIL ?? 'neto204719@gmail.com')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
)
export const isAdminEmail = (email) => ADMIN_EMAILS.has((email ?? '').toLowerCase())

function Guard({ auth, children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-surface-0 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
  if (auth  && !user) return <Navigate to="/login"     replace />
  if (!auth &&  user) return <Navigate to="/dashboard" replace />
  return children
}

function AdminGuard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-surface-0 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (!isAdminEmail(user.email)) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Guard auth={false}><Login /></Guard>} />
      <Route element={<Guard auth={true}><Layout /></Guard>}>
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/questoes"   element={<Questoes />} />
        <Route path="/desempenho" element={<Desempenho />} />
        <Route path="/plano"      element={<Plano />} />
        <Route path="/config"     element={<Config />} />
        {/* Admin — only accessible to ADMIN_EMAILS, redirects others to /dashboard */}
        <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider><AppRoutes /></AuthProvider>
    </BrowserRouter>
  )
}
