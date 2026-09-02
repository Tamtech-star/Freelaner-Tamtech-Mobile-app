import api from './client'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { STORAGE_KEYS } from '../constants/config'
import type { AuthResponse, UserRole, AuthUser } from '../types'
import { clearStoredAuthenticatedRoute } from '../navigation/routeStorage'

// expo-secure-store has no web implementation. Keep the same async API on web
// so browser development and web builds can log in and out without calling the
// missing native module methods.
function webStorage(): Storage | null {
  return typeof window !== 'undefined' ? window.localStorage : null
}

async function setAuthValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage()?.setItem(key, value)
    return
  }
  await SecureStore.setItemAsync(key, value)
}

async function getAuthValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return webStorage()?.getItem(key) ?? null
  }
  return SecureStore.getItemAsync(key)
}

async function deleteAuthValue(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage()?.removeItem(key)
    return
  }
  await SecureStore.deleteItemAsync(key)
}

export async function mobileLogin(
  email: string,
  password: string,
): Promise<{ role: UserRole; user: AuthUser }> {
  const response = await api.post<AuthResponse>('/auth/mobile-login', {
    email,
    password,
  })

  const { token, role, user } = response.data

  await setAuthValue(STORAGE_KEYS.AUTH_TOKEN, token)
  await setAuthValue(STORAGE_KEYS.USER_ROLE, role)
  await setAuthValue(STORAGE_KEYS.USER_DATA, JSON.stringify(user))

  return { role, user }
}

export async function logout(): Promise<void> {
  await Promise.all([
    deleteAuthValue(STORAGE_KEYS.AUTH_TOKEN),
    deleteAuthValue(STORAGE_KEYS.USER_ROLE),
    deleteAuthValue(STORAGE_KEYS.USER_DATA),
    clearStoredAuthenticatedRoute(),
  ])
}

export async function getStoredAuth(): Promise<{
  token: string
  role: UserRole
  user: AuthUser
} | null> {
  const token = await getAuthValue(STORAGE_KEYS.AUTH_TOKEN)
  const role = await getAuthValue(STORAGE_KEYS.USER_ROLE)
  const userData = await getAuthValue(STORAGE_KEYS.USER_DATA)

  if (!token || !role) return null

  return {
    token,
    role: role as UserRole,
    user: userData ? JSON.parse(userData) : { id: '', email: '' },
  }
}

//  Freelancer Registration 
export interface FreelancerRegistrationPayload {
  fullName: string
  age: number
  sex: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  occupation: string
  email: string
  mpesaPhone: string
  alternatePhone?: string
  kraPin: string
  nationalId: string
  location: string
  county: string
  address: string
}

export interface RegistrationResponse {
  ok: boolean
  freelancerId?: string
  freelancerCode?: string
  registrationStatus: string
  accountState: string
  message?: string
}

export async function registerFreelancer(
  payload: FreelancerRegistrationPayload
): Promise<RegistrationResponse> {
  const response = await api.post<RegistrationResponse & { error?: string }>(
    '/portal/freelancers/register',
    payload
  )

  if (response.data.error) {
    throw new Error(response.data.error)
  }

  return response.data
}
