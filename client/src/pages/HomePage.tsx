import { useNavigate } from 'react-router-dom'
import { clearAuthToken } from '../services/auth'

export function HomePage() {
  const navigate = useNavigate()

  function handleLogout() {
    clearAuthToken()
    navigate('/login', { replace: true })
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Home</h1>
        <p>You are logged in.</p>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </section>
    </main>
  )
}