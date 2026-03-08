import { useEffect, useRef, useState } from 'react'

export const DEFAULT_POLLING_INTERVAL_MS = 10_000
export const MIN_POLLING_INTERVAL_MS = 5_000

type PollingOptions<T> = {
  enabled?: boolean
  intervalMs?: number
  leading?: boolean
  pauseWhenHidden?: boolean
  stopWhen?: (result: T) => boolean
  onError?: (error: unknown) => 'continue' | 'stop'
}

type PollingState<T> = {
  data: T | null
  error: unknown
  isPolling: boolean
  lastUpdatedAt: number | null
  refresh: () => Promise<void>
}

export function usePolling<T>(
  poller: () => Promise<T>,
  options: PollingOptions<T> = {},
): PollingState<T> {
  const {
    enabled = true,
    intervalMs = DEFAULT_POLLING_INTERVAL_MS,
    leading = true,
    pauseWhenHidden = true,
    stopWhen,
    onError,
  } = options
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const pollerRef = useRef(poller)
  const stopWhenRef = useRef(stopWhen)
  const onErrorRef = useRef(onError)
  const refreshRef = useRef<() => Promise<void>>(async () => undefined)

  pollerRef.current = poller
  stopWhenRef.current = stopWhen
  onErrorRef.current = onError

  useEffect(() => {
    let timerId: number | null = null
    let stopped = false

    function clearTimer() {
      if (timerId !== null) {
        window.clearTimeout(timerId)
        timerId = null
      }
    }

    if (!enabled) {
      refreshRef.current = async () => undefined
      return undefined
    }

    function scheduleNext(executePoll: () => Promise<void>) {
      clearTimer()

      if (stopped) {
        return
      }

      timerId = window.setTimeout(() => {
        void executePoll()
      }, Math.max(intervalMs, MIN_POLLING_INTERVAL_MS))
    }

    async function executePoll() {
      if (stopped) {
        return
      }

      if (pauseWhenHidden && document.visibilityState === 'hidden') {
        scheduleNext(executePoll)
        return
      }

      setIsPolling(true)
      setError(null)

      try {
        const result = await pollerRef.current()
        setData(result)
        setLastUpdatedAt(Date.now())

        if (stopWhenRef.current?.(result)) {
          stopped = true
          clearTimer()
          return
        }
      } catch (pollingError) {
        setError(pollingError)

        if (onErrorRef.current?.(pollingError) === 'stop') {
          stopped = true
          clearTimer()
          return
        }
      } finally {
        setIsPolling(false)
      }

      scheduleNext(executePoll)
    }

    refreshRef.current = executePoll

    if (leading) {
      void executePoll()
    } else {
      scheduleNext(executePoll)
    }

    return () => {
      stopped = true
      clearTimer()
    }
  }, [enabled, intervalMs, leading, pauseWhenHidden])

  useEffect(() => {
    if (!pauseWhenHidden || !enabled) {
      return undefined
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void refreshRef.current()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, pauseWhenHidden])

  return {
    data,
    error,
    isPolling,
    lastUpdatedAt,
    refresh: () => refreshRef.current(),
  }
}