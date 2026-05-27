import { createContext, useContext } from 'react'

const AuthContext = createContext(null)

const GUEST = { id: null, name: 'Guest', email: 'guest@local', role: 'admin', is_active: true }

export function AuthProvider({ children }) {
  return (
    <AuthContext.Provider value={{ user: GUEST, loading: false, login: () => {}, register: () => {}, logout: () => {} }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
