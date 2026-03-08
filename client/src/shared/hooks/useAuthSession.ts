import { useSyncExternalStore } from 'react'
import {
  getStoredAuthToken,
  subscribeToStoredAuthToken,
} from '../services/auth-token-storage'

function getAuthSnapshot() {
  const token = getStoredAuthToken()

  return {
    token,
    isAuthenticated: Boolean(token),
  }
}

export function useAuthSession() {
  return useSyncExternalStore(
    subscribeToStoredAuthToken,
    getAuthSnapshot,
    getAuthSnapshot,
  )
}