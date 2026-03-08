import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import {
  clearStoredAuthToken,
  getStoredAuthToken,
} from './auth-token-storage'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969'
const REQUEST_ID_HEADER = 'x-request-id'

type ApiErrorEnvelope = {
  success: false
  requestId: string
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type PaginationMeta = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

type ApiMeta = {
  pagination?: PaginationMeta
}

type ApiSuccessEnvelope<T> = {
  success: true
  requestId: string
  data: T
  meta?: ApiMeta
}

export type ApiResponse<T> = {
  data: T
  requestId: string
  meta?: ApiMeta
}

type ApiRequestOptions = AxiosRequestConfig & {
  requiresAuth?: boolean
}

type RequestConfigWithAuth = InternalAxiosRequestConfig & {
  requiresAuth?: boolean
}

export class ApiClientError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown
  readonly requestId?: string

  constructor(options: {
    status: number
    code: string
    message: string
    details?: unknown
    requestId?: string
  }) {
    super(options.message)
    this.name = 'ApiClientError'
    this.status = options.status
    this.code = options.code
    this.details = options.details
    this.requestId = options.requestId
  }
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
})

axiosInstance.interceptors.request.use((config: RequestConfigWithAuth) => {
  const requestId = createRequestId()

  config.headers.set(REQUEST_ID_HEADER, requestId)

  if (config.requiresAuth !== false) {
    const token = getStoredAuthToken()

    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }
  }

  return config
})

function mapApiResponse<T>(envelope: ApiSuccessEnvelope<T>): ApiResponse<T> {
  return {
    data: envelope.data,
    requestId: envelope.requestId,
    meta: envelope.meta,
  }
}

async function request<T>(config: ApiRequestOptions): Promise<ApiResponse<T>> {
  try {
    const response = await axiosInstance.request<ApiSuccessEnvelope<T>>({
      ...config,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    })

    return mapApiResponse(response.data)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export const apiClient = {
  get<T>(url: string, config?: ApiRequestOptions) {
    return request<T>({
      ...config,
      method: 'GET',
      url,
    })
  },

  post<T>(url: string, data?: unknown, config?: ApiRequestOptions) {
    return request<T>({
      ...config,
      method: 'POST',
      url,
      data,
    })
  },
}

function normalizeApiError(error: unknown): ApiClientError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorEnvelope>
    const status = axiosError.response?.status ?? 500
    const envelope = axiosError.response?.data

    if (status === 401) {
      clearStoredAuthToken()
    }

    if (envelope?.success === false) {
      return new ApiClientError({
        status,
        code: envelope.error.code,
        message: envelope.error.message,
        details: envelope.error.details,
        requestId: envelope.requestId,
      })
    }

    return new ApiClientError({
      status,
      code: 'HTTP_ERROR',
      message: axiosError.message || 'Request failed',
    })
  }

  if (error instanceof Error) {
    return new ApiClientError({
      status: 500,
      code: 'UNKNOWN_ERROR',
      message: error.message,
    })
  }

  return new ApiClientError({
    status: 500,
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected client error occurred',
  })
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `req-${Date.now()}`
}