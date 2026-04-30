import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('isetag_token')
    if (token) {
      authAPI.me()
        .then(res => setAdmin(res.data.admin))
        .catch(() => localStorage.removeItem('isetag_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const res = await authAPI.login(email, password)
    const { admin: adminData, token } = res.data
    localStorage.setItem('isetag_token', token)
    setAdmin(adminData)
    return adminData
  }

  const logout = async () => {
    try { await authAPI.logout() } catch {}
    localStorage.removeItem('isetag_token')
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
