const TOKEN_KEY = 'accessToken'
const AUTH_TOKEN_CHANGED_EVENT = 'auth-token-changed'

function notifyAuthTokenChanged(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT))
}

export function setStoredAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  notifyAuthTokenChanged()
}

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function hasStoredAuthToken(): boolean {
  return Boolean(getStoredAuthToken())
}

export function clearStoredAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  notifyAuthTokenChanged()
}

export function subscribeToStoredAuthToken(
  onStoreChange: () => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  function handleStorageEvent(event: StorageEvent): void {
    if (event.key !== null && event.key !== TOKEN_KEY) {
      return
    }

    onStoreChange()
  }

  window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onStoreChange)
  window.addEventListener('storage', handleStorageEvent)

  return () => {
    window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onStoreChange)
    window.removeEventListener('storage', handleStorageEvent)
  }
}