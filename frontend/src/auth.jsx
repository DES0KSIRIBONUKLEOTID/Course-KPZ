import { createContext, useContext, useEffect, useState } from 'react'
import { api, clearToken, getToken, setToken, setUnauthorizedHandler } from './api'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!getToken()) // чи вже перевірили збережений токен

  useEffect(() => {
    // якщо сервер відповів 401 — токен недійсний, виходимо
    setUnauthorizedHandler(() => {
      clearToken()
      setUser(null)
    })

    if (getToken()) {
      api.get('/me').then(setUser).catch(() => {}).finally(() => setReady(true))
    }
  }, [])

  async function login(email, password) {
    const data = await api.post('/login', { email, password })
    setToken(data.token)
    setUser(data.user)
  }

  async function logout() {
    try {
      await api.post('/logout')
    } catch {
      // токен міг уже стати недійсним — це нормально
    }
    clearToken()
    setUser(null)
  }

  const value = { user, ready, login, logout, isAdmin: user?.role === 'admin' }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
