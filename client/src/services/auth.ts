import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969'
const TOKEN_KEY = 'accessToken'

type LoginPayload = {
  email: string
  password: string
}

type LoginResponse = {
  accessToken: string
}

export async function login(payload: LoginPayload): Promise<void> {
  const response = await axios.post<LoginResponse>(
    `${API_BASE_URL}/auth/login`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )

  localStorage.setItem(TOKEN_KEY, response.data.accessToken)
}

export function hasAuthToken(): boolean {
  return Boolean(localStorage.getItem(TOKEN_KEY))
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}