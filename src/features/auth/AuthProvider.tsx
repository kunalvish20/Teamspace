import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase/client'
import { DEV_BYPASS_EMAIL, DEV_BYPASS_NAME, DEV_BYPASS_USER_ID, devBypassEnabled } from '../../lib/dev-bypass'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  bypass: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithOtp: (email: string) => Promise<void>
  verifyOtp: (email: string, token: string) => Promise<void>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const bypassUser = {
  id: DEV_BYPASS_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: DEV_BYPASS_EMAIL,
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: { provider: 'dev-bypass', providers: ['dev-bypass'] },
  user_metadata: { full_name: DEV_BYPASS_NAME, avatar_url: null, dev_bypass: true },
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_anonymous: false,
} as User

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!devBypassEnabled)

  useEffect(() => {
    if (devBypassEnabled) {
      setLoading(false)
      return
    }

    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })
    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (devBypassEnabled) return
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
    if (error) throw error
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (devBypassEnabled) return
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signInWithOtp = useCallback(async (email: string) => {
    if (devBypassEnabled) return
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/app`,
      },
    })
    if (error) throw error
  }, [])

  const verifyOtp = useCallback(async (email: string, token: string) => {
    if (devBypassEnabled) return
    const { error, data } = await supabase.auth.verifyOtp({
      email,
      token: token.trim(),
      type: 'email',
    })
    if (error) throw error
    if (data.session) {
      setSession(data.session)
    }
  }, [])

  const signOut = useCallback(async () => {
    if (devBypassEnabled) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const sendPasswordReset = useCallback(async (email: string) => {
    if (devBypassEnabled) return
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    if (devBypassEnabled) return
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: devBypassEnabled ? bypassUser : session?.user ?? null,
    loading,
    bypass: devBypassEnabled,
    signUp,
    signIn,
    signInWithOtp,
    verifyOtp,
    signOut,
    sendPasswordReset,
    updatePassword,
  }), [session, loading, signUp, signIn, signInWithOtp, verifyOtp, signOut, sendPasswordReset, updatePassword])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
