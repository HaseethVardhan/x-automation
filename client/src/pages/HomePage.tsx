import { useEffect, useState } from 'react'
import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingState } from '../shared/components/LoadingState'
import { apiClient } from '../shared/services/api-client'

export function HomePage() {
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await apiClient.get<string>('/')

        if (!isMounted) {
          return
        }

        setWelcomeMessage(response.data)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'The dashboard could not be loaded.',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <LoadingState
        title="Loading workspace"
        message="Fetching the authenticated dashboard with the shared API client."
      />
    )
  }

  if (errorMessage) {
    return (
      <ErrorState
        title="Dashboard unavailable"
        message={errorMessage}
        actionLabel="Retry"
        onAction={() => window.location.reload()}
      />
    )
  }

  if (!welcomeMessage) {
    return (
      <EmptyState
        title="No dashboard data yet"
        message="Authenticated pages should show an intentional empty state when the API returns no usable content."
      />
    )
  }

  return (
    <section className="dashboard-panel">
      <div className="eyebrow">Overview</div>
      <h1>Home</h1>
      <p className="dashboard-message">{welcomeMessage}</p>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <h2>Route layout convention</h2>
          <p>
            Authenticated screens render inside a shared shell with header actions,
            consistent spacing, and nested routes.
          </p>
        </article>

        <article className="dashboard-card">
          <h2>API client convention</h2>
          <p>
            Authenticated requests flow through a single typed client that attaches
            the bearer token, request id, and normalized error handling.
          </p>
        </article>

        <article className="dashboard-card">
          <h2>State rendering convention</h2>
          <p>
            Loading, error, and empty views use shared components rather than ad hoc
            markup inside each page.
          </p>
        </article>
      </div>
    </section>
  )
}