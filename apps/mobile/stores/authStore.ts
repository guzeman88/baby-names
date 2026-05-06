import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { authApi, setAccessToken, type User } from '../lib/api'
import { guestStorage } from '../lib/guestStorage'

const REFRESH_TOKEN_KEY = 'refresh_token'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  restoreSession: () => Promise<void>
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  restoreSession: async () => {
    try {
      const result = await authApi.refresh()
      setAccessToken(result.accessToken)
      const { usersApi } = await import('../lib/api')
      const user = await usersApi.getMe()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch {
      setAccessToken(null)
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  login: async (email, password) => {
    const { user, accessToken } = await authApi.login(email, password)
    setAccessToken(accessToken)
    set({ user, isAuthenticated: true })
  },

  register: async (email, password) => {
    // Migrate any guest swipes accumulated before registration
    const guestSwipes = await guestStorage.getSwipes()
    const { user, accessToken } = await authApi.register(email, password)
    setAccessToken(accessToken)
    set({ user, isAuthenticated: true })
    // Best-effort: upload guest swipes to the user's account
    if (guestSwipes.length > 0) {
      const { swipesApi } = await import('../lib/api')
      try {
        for (const s of guestSwipes) {
          await swipesApi.swipe(s.nameId, s.decision)
        }
        await guestStorage.clearSwipes()
      } catch { /* non-critical */ }
    }
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch { /* best effort */ }
    setAccessToken(null)
    set({ user: null, isAuthenticated: false })
  },

  setUser: (user: User) => set({ user }),
}))
