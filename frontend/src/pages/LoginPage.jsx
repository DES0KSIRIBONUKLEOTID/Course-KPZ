import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth'
import Icon from '../components/Icon'

export default function LoginPage() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/orders" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <aside className="login-brand">
        <span className="brand-logo big">
          <Icon name="wrench" size={28} />
        </span>
        <h1>Сервісний центр</h1>
        <p>Автоматизація роботи з ремонту комп’ютерної техніки</p>
        <ul>
          <li>Облік клієнтів і техніки</li>
          <li>Заявки на ремонт зі статусами</li>
          <li>Автоматичний розрахунок вартості</li>
          <li>Склад запчастин і звіти</li>
        </ul>
      </aside>

      <div className="login-form-wrap">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Вхід у систему</h2>
          <p className="muted">Для працівників сервісного центру</p>
          {error && <div className="alert">{error}</div>}

          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          <label className="field">
            <span>Пароль</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          <button type="submit" className="btn primary wide" disabled={busy}>
            {busy ? 'Вхід...' : 'Увійти'}
          </button>
        </form>
      </div>
    </div>
  )
}
