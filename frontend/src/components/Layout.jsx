import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth'
import { initials, roleLabel } from '../format'
import Icon from './Icon'

const NAV = [
  { to: '/orders', icon: 'orders', label: 'Заявки' },
  { to: '/clients', icon: 'clients', label: 'Клієнти і техніка' },
  { to: '/catalog', icon: 'catalog', label: 'Послуги і склад' },
  { to: '/reports', icon: 'reports', label: 'Звіти' },
  { to: '/users', icon: 'staff', label: 'Співробітники', adminOnly: true },
]

/** Бічна панель з навігацією + місце для поточної сторінки. */
export default function Layout() {
  const { user, logout, isAdmin } = useAuth()

  return (
    <div className="shell">
      <aside className="sidebar no-print">
        <div className="brand">
          <span className="brand-logo">
            <Icon name="wrench" size={20} />
          </span>
          <div>
            <strong>Сервісний центр</strong>
            <small>Ремонт техніки</small>
          </div>
        </div>

        <nav>
          {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <NavLink key={item.to} to={item.to}>
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <span className="avatar">{initials(user.name)}</span>
          <div className="who">
            <strong>{user.name}</strong>
            <small>{roleLabel(user.role)}</small>
          </div>
          <button className="icon-btn" title="Вийти" onClick={logout}>
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
