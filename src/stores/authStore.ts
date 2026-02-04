import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

type AuthState = {
  initialized: boolean
  session: Session | null
  user: User | null
  error: string | null
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  session: null,
  user: null,
  error: null,
  init: async () => {
    if (get().initialized) return
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      set({ initialized: true, error: error.message })
    } else {
      set({ initialized: true, session: data.session, user: data.session?.user ?? null, error: null })
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null })
    })
  },
  signIn: async (email, password) => {
    set({ error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) set({ error: error.message })
  },
  signOut: async () => {
    set({ error: null })
    const { error } = await supabase.auth.signOut()
    if (error) set({ error: error.message })
  },
}))

