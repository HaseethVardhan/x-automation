const TOKEN_KEY = 'accessToken'

export function setStoredAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function hasStoredAuthToken(): boolean {
  return Boolean(getStoredAuthToken())
}

export function clearStoredAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}