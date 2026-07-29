import  { create } from 'zustand'
import type { AuthState, AuthUser, UserRole } from '../types'
import { mobileLogin, logout as logoutApi, getStoredAuth } from '../api/auth'

interface AuthActions {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  restoreSession: () => Promise<void>
  setUser: (user: AuthUser) => void
  setRole: (role: UserRole) => void
}

type AuthStore = AuthState & AuthActions

const initialState: AuthState = {
  token: null,
  role: null,
  user: null,
  isLoading: true, // starts true while we check for stored session
  isAuthenticated: false,
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true })
      const { role, user } = await mobileLogin(email, password)

      set({
        token: 'active', // actual token is in SecureStore, not memory
        role,
        user,
        isAuthenticated: true,
        isLoading: false,
      })

      return { success: true }
    } catch (error: any) {
      console.log('Login error:', JSON.stringify({
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      }))
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Login failed. Please check your credentials.'

      set({ isLoading: false })
      return { success: false, error: message }
    }
  },

  logout: async () => {
    await logoutApi()
    set({
      ...initialState,
      isLoading: false,
    })
  },

  restoreSession: async () => {
    try {
      const stored = await getStoredAuth()
      if (stored) {
        set({
          token: stored.token,
          role: stored.role,
          user: stored.user,
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  setUser: (user: AuthUser) => {
    set({ user })
  },

  setRole: (role: UserRole) => {
    set({ role })
  },
}))
