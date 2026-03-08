import { startTransition, useEffect, useRef, useState } from 'react'
import { ApiClientError } from '../services/api-client'

type QueryFunction<T> = () => Promise<T>

type UseApiQueryOptions<T> = {
  queryFn: QueryFunction<T>
  enabled?: boolean
  initialData?: T | null
}

type UseApiQueryResult<T> = {
  data: T | null
  error: ApiClientError | null
  isLoading: boolean
  isRefreshing: boolean
  refetch: () => Promise<void>
}

export function useApiQuery<T>({
  queryFn,
  enabled = true,
  initialData = null,
}: UseApiQueryOptions<T>): UseApiQueryResult<T> {
  const [data, setData] = useState<T | null>(initialData)
  const [error, setError] = useState<ApiClientError | null>(null)
  const [isLoading, setIsLoading] = useState(enabled && initialData === null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const queryFnRef = useRef(queryFn)
  const requestIdRef = useRef(0)

  queryFnRef.current = queryFn

  async function executeQuery(mode: 'initial' | 'refresh'): Promise<void> {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (mode === 'initial') {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }

    setError(null)

    try {
      const result = await queryFnRef.current()

      if (requestIdRef.current !== requestId) {
        return
      }

      startTransition(() => {
        setData(result)
      })
    } catch (queryError) {
      if (requestIdRef.current !== requestId) {
        return
      }

      setError(normalizeQueryError(queryError))
    } finally {
      if (requestIdRef.current === requestId) {
        if (mode === 'initial') {
          setIsLoading(false)
        } else {
          setIsRefreshing(false)
        }
      }
    }
  }

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    void executeQuery('initial')
  }, [enabled])

  return {
    data,
    error,
    isLoading,
    isRefreshing,
    refetch: async () => {
      await executeQuery(data === null ? 'initial' : 'refresh')
    },
  }
}

function normalizeQueryError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error
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