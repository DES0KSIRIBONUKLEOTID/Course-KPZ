import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import Layout from './components/Layout'
import CatalogPage from './pages/CatalogPage'
import ClientsPage from './pages/ClientsPage'
import LoginPage from './pages/LoginPage'
import OrderPage from './pages/OrderPage'
import OrdersPage from './pages/OrdersPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'

/** Пускає далі лише авторизованих (і, за потреби, лише адміністраторів). */
function Protected({ adminOnly = false, children }) {
  const { user, ready, isAdmin } = useAuth()

  if (!ready) return <p className="muted">Завантаження...</p>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/orders" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route
              path="/users"
              element={
                <Protected adminOnly>
                  <UsersPage />
                </Protected>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/orders" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
