import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import { initials, roleLabel } from '../format'
import { useMediaQuery } from '../hooks'
import CommandPalette from './CommandPalette'
import Icon from './Icon'
import Notifications from './Notifications'

const NAV = [
  { to: '/orders', icon: 'orders', label: 'Заявки' },
  { to: '/clients', icon: 'clients', label: 'Клієнти і техніка' },
  { to: '/catalog', icon: 'catalog', label: 'Послуги і склад' },
  { to: '/reports', icon: 'reports', label: 'Звіти' },
  { to: '/users', icon: 'staff', label: 'Співробітники', adminOnly: true },
]

/** Бічна панель з навігацією, швидким пошуком (Ctrl+K) та місце для поточної сторінки. */
export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { pathname } = useLocation()
  const mobile = useMediaQuery('(max-width: 960px)')
  const [menuOpen, setMenuOpen] = useState(false)

  // після переходу на іншу сторінку меню телефона закривається
  useEffect(() => setMenuOpen(false), [pathname, mobile])

  // гарячі клавіші: Ctrl+K (Cmd+K) відкриває/закриває пошук, «/» відкриває поза полями вводу
  useEffect(() => {
    function onKey(event) {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      } else if (event.key === '/' && !typing) {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="shell">
      {mobile ? (
        <>
          <header className="mobile-bar no-print">
            <button
              className="icon-btn"
              aria-label={menuOpen ? 'Закрити меню' : 'Відкрити меню'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Icon name={menuOpen ? 'x' : 'menu'} size={22} />
            </button>
            <div className="mobile-title">
              <span className="brand-logo small">
                <Icon name="wrench" size={16} />
              </span>
              <strong>Сервісний центр</strong>
            </div>
            <button className="icon-btn" aria-label="Пошук і дії" onClick={() => setPaletteOpen(true)}>
              <Icon name="search" size={20} />
            </button>
            <Notifications />
          </header>
          {menuOpen && (
            <>
              <div className="mobile-scrim no-print" onClick={() => setMenuOpen(false)} />
              <nav className="mobile-menu no-print">
                {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => (
                  <NavLink key={item.to} to={item.to}>
                    <Icon name={item.icon} />
                    {item.label}
                  </NavLink>
                ))}
                <div className="menu-user">
                  <span className="avatar">{initials(user.name)}</span>
                  <div className="who">
                    <strong>{user.name}</strong>
                    <small>{roleLabel(user.role)}</small>
                  </div>
                  <button className="btn ghost small" onClick={logout}>
                    <Icon name="logout" size={16} />
                    Вийти
                  </button>
                </div>
              </nav>
            </>
          )}
        </>
      ) : (
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

        <button className="search-trigger" onClick={() => setPaletteOpen(true)}>
          <Icon name="search" size={16} />
          <span>Пошук і дії</span>
          <kbd>Ctrl K</kbd>
        </button>

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
          <Notifications />
          <button className="icon-btn" title="Вийти" onClick={logout}>
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      )}

      <main className="content">
        {/* key змушує сторінку з'являтися з анімацією при кожному переході */}
        <div key={pathname} className="page">
          <Outlet />
        </div>
      </main>

      {paletteOpen && <CommandPalette open onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}
