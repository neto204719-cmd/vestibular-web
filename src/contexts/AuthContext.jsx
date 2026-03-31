import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { setToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(accessToken) {
    if (!accessToken) { setProfile(null); return }
    setToken(accessToken)
    try {
      const { data } = await supabase.from('profiles').select('*').single()
      setProfile(data)
    } catch { setProfile(null) }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      loadProfile(session?.access_token ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      loadProfile(session?.access_token ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn  = (email, pw)           => supabase.auth.signInWithPassword({ email, password: pw }).then(({ error }) => { if (error) throw error })
  const signUp  = (email, pw, name)     => supabase.auth.signUp({ email, password: pw, options: { data: { display_name: name } } }).then(({ error }) => { if (error) throw error })
  const signOut = async ()              => { await supabase.auth.signOut(); setToken(null) }
  const refreshProfile = async ()       => { const { data: { session } } = await supabase.auth.getSession(); await loadProfile(session?.access_token ?? null) }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
