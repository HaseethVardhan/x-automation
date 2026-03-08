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
}

export async function login(payload: LoginPayload): Promise<void> {
  const response = await apiClient.post<LoginResponse>('/auth/login', payload, {
    requiresAuth: false,
  })

  setStoredAuthToken(response.data.accessToken)
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