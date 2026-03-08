import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { clearAuthToken, hasAuthToken } from '../services/auth'

export function AuthenticatedLayout() {
  const navigate = useNavigate()

  if (!hasAuthToken()) {
    return <Navigate to="/login" replace />
  }

  function handleLogout() {
    clearAuthToken()
    navigate('/login', { replace: true })
  }

  return (
    <main className="app-shell auth-shell">
      <header className="auth-shell__header">
        <div className="auth-shell__brand">
          <div className="eyebrow">X Automation</div>
          <h1>Operator workspace</h1>
          <p>Shared layout for authenticated pages.</p>
        </div>

        <div className="auth-shell__actions">
          <button
            type="button"
            className="button-secondary"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <section className="auth-shell__content">
        <Outlet />
      </section>
    </main>
  )
}