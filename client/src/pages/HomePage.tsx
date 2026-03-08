import { EmptyState } from '../shared/components/EmptyState'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingState } from '../shared/components/LoadingState'
import { useApiQuery } from '../shared/hooks/useApiQuery'
import { apiClient } from '../shared/services/api-client'

export function HomePage() {
  const dashboardQuery = useApiQuery({
    queryFn: async () => {
      const response = await apiClient.get<string>('/')
      return response.data
    },
  })

  if (dashboardQuery.isLoading) {
    return (
      <LoadingState
        title="Loading workspace"
        message="Fetching the authenticated dashboard with the shared query hook and API client."
      />
    )
  }

  if (dashboardQuery.error) {
    return (
      <ErrorState
        title="Dashboard unavailable"
        message={dashboardQuery.error.message}
        actionLabel="Retry"
        onAction={() => void dashboardQuery.refetch()}
      />
    )
  }

  if (!dashboardQuery.data) {
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
      <p className="dashboard-message">{dashboardQuery.data}</p>

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
            Authenticated requests flow through a single typed client plus a shared
            query hook for loading, refresh, and normalized error state.
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