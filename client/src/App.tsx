import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { hasAuthToken } from './services/auth'

function App() {
  useLocation()
  const isAuthenticated = hasAuthToken()

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/home' : '/login'} replace />}
      />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/home" replace /> : <LoginPage />}
      />
      <Route
        path="/home"
        element={isAuthenticated ? <HomePage /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
