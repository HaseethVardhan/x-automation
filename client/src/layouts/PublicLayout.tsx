import { Navigate, Outlet } from 'react-router-dom'
import { hasAuthToken } from '../services/auth'

export function PublicLayout() {
  if (hasAuthToken()) {
    return <Navigate to="/home" replace />
  }

  return (
    <main className="app-shell public-shell">
      <Outlet />
    </main>
  )
}