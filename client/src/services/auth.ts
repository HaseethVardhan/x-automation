import {
  clearStoredAuthToken,
  getStoredAuthToken,
  hasStoredAuthToken,
  setStoredAuthToken,
} from '../shared/services/auth-token-storage'
import { ApiClientError, apiClient } from '../shared/services/api-client'

type LoginPayload = {
  email: string
  password: string
}

type LoginResponse = {
  accessToken: string
  user: {
    id: string
    email: string
  }
}

export async function login(payload: LoginPayload): Promise<LoginResponse['user']> {
  const response = await apiClient.post<LoginResponse>('/auth/login', payload, {
    requiresAuth: false,
  })

  setStoredAuthToken(response.data.accessToken)

  return response.data.user
}

export function hasAuthToken(): boolean {
  return hasStoredAuthToken()
}

export function getAuthToken(): string | null {
  return getStoredAuthToken()
}

export function clearAuthToken(): void {
  clearStoredAuthToken()
}

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (error instanceof ApiClientError) {
    return error.message
  }

  return fallbackMessage
}