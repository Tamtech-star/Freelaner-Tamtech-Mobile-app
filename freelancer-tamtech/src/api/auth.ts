import api from './client'
import * as SecureStore from 'expo-secure-store'
import { STORAGE_KEYS } from '../constants/config'
import type { AuthResponse, UserRole, AuthUser } from '../types'

export async function mobileLogin(
  email: string,
  password: string,
): Promise<{ role: UserRole; user: AuthUser }> {
  const response = await api.post<AuthResponse>('/auth/mobile-login', {
    email,
    password,
  })

  const { token, role, user } = response.data

  await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token)
  await SecureStore.setItemAsync(STORAGE_KEYS.USER_ROLE, role)
  await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user))

  return { role, user }
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN)
  await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ROLE)
  await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA)
}

export async function getStoredAuth(): Promise<{
  token: string
  role: UserRole
  user: AuthUser
} | null> {
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN)
  const role = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ROLE)
  const userData = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA)

  if (!token || !role) return null

  return {
    token,
    role: role as UserRole,
    user: userData ? JSON.parse(userData) : { id: '', email: '' },
  }
}
