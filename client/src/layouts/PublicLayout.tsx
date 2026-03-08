import { Navigate, Outlet } from 'react-router-dom'
import { useAuthSession } from '../shared/hooks/useAuthSession'

export function PublicLayout() {
  const { isAuthenticated } = useAuthSession()

  if (isAuthenticated) {
    return <Navigate to="/home" replace />
  }

  return (
    <main className="app-shell public-shell">
      <Outlet />
    </main>
  )
}