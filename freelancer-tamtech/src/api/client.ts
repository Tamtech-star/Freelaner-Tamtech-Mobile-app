import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import * as SecureStore from 'expo-secure-store'
import { API_BASE_URL, STORAGE_KEYS } from '../constants/config'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRedirecting = false

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN)
      if (token && config.headers) {
        config.headers.Authorization = 'Bearer ' + token
      }
    } catch {
      // SecureStore might fail in some environments
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Don't clear tokens for login/register endpoints — 401 is expected for bad credentials
    const url = (error.config as any)?.url || ''
    const isAuthEndpoint = url.includes('/auth/mobile-login') || url.includes('/auth/register')

    if (error.response?.status === 401 && !isRedirecting && !isAuthEndpoint) {
      isRedirecting = true
      try {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN)
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ROLE)
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA)
      } catch {
        // ignore cleanup errors
      }
      isRedirecting = false
    }
    return Promise.reject(error)
  },
)

export default api
