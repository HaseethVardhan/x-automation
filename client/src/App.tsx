import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthenticatedLayout } from './layouts/AuthenticatedLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { hasAuthToken } from './services/auth'

function App() {
  const isAuthenticated = hasAuthToken()

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/home' : '/login'} replace />}
      />

      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<AuthenticatedLayout />}>
        <Route path="/home" element={<HomePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
