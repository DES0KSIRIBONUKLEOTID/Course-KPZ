import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { useDebounce } from '../hooks'
import Icon from './Icon'

/**
 * Швидкий пошук і дії (Ctrl+K). Шукає заявки на сервері, клієнтів серед завантажених,
 * а також пропонує швидкі дії та розділи. Керування: ↑ ↓ Enter, закрити Esc.
 */
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const { isAdmin, logout } = useAuth()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [clients, setClients] = useState([])
  const [orders, setOrders] = useState([])
  const inputRef = useRef(null)
  const debounced = useDebounce(query.trim(), 200)

  // при відкритті очищаємо рядок і підвантажуємо клієнтів
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    api.get('/clients').then(setClients).catch(() => {})
  }, [open])

  // заявки шукаємо на сервері (майстру сервер повертає лише його заявки)
  useEffect(() => {
    if (!open || debounced.length < 1) return
    let cancelled = false
    api
      .get('/orders', { search: debounced })
      .then((res) => !cancelled && setOrders(res.data.slice(0, 5)))
      .catch(() => !cancelled && setOrders([]))
    return () => {
      cancelled = true
    }
  }, [debounced, open])

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    const go = (path) => () => navigate(path)
    const list = []

    const actions = [
      isAdmin && { icon: 'plus', title: 'Нова заявка', hint: 'Створити заявку на ремонт', run: go('/orders?new=1') },
      { icon: 'reports', title: 'Звіт за місяць', hint: 'Відкрити звіти', run: go('/reports') },
      { icon: 'logout', title: 'Вийти з системи', hint: '', run: logout },
    ].filter(Boolean)
    const pages = [
      { icon: 'orders', title: 'Заявки', run: go('/orders') },
      { icon: 'clients', title: 'Клієнти і техніка', run: go('/clients') },
      { icon: 'catalog', title: 'Послуги і склад', run: go('/catalog') },
      { icon: 'reports', title: 'Звіти', run: go('/reports') },
      isAdmin && { icon: 'staff', title: 'Співробітники', run: go('/users') },
    ].filter(Boolean)

    const match = (text) => !q || text.toLowerCase().includes(q)

    // результати старого запиту не показуємо, коли рядок уже порожній
    const found = debounced.length < 1 ? [] : orders
    found.forEach((o) =>
      list.push({
        group: 'Заявки',
        icon: 'file',
        title: `№${o.id} ${o.device.title}`,
        hint: `${o.client.full_name} · ${o.status_label}`,
        run: go(`/orders/${o.id}`),
      }),
    )
    if (q) {
      clients
        .filter((c) => `${c.full_name} ${c.phone} ${c.email ?? ''}`.toLowerCase().includes(q))
        .slice(0, 5)
        .forEach((c) =>
          list.push({
            group: 'Клієнти',
            icon: 'clients',
            title: c.full_name,
            hint: `${c.phone} · показати заявки клієнта`,
            run: go(`/orders?search=${encodeURIComponent(c.phone)}`),
          }),
        )
    }
    actions.filter((a) => match(a.title)).forEach((a) => list.push({ group: 'Дії', ...a }))
    pages.filter((p) => match(p.title)).forEach((p) => list.push({ group: 'Розділи', ...p }))
    return list
  }, [query, debounced, orders, clients, isAdmin, navigate, logout])

  // активний пункт не виходить за межі списку
  const current = Math.min(active, Math.max(items.length - 1, 0))

  if (!open) return null

  function choose(item) {
    onClose()
    item.run()
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current + 1) % Math.max(items.length, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current - 1 + items.length) % Math.max(items.length, 1))
    } else if (event.key === 'Enter' && items[current]) {
      event.preventDefault()
      choose(items[current])
    } else if (event.key === 'Escape') {
      onClose()
    }
  }

  let lastGroup = null

  return (
    <div className="overlay palette-overlay" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Номер заявки, клієнт, телефон, техніка, дія..."
          />
          <kbd>Esc</kbd>
        </div>

        <ul className="palette-list">
          {items.map((item, index) => {
            const header = item.group !== lastGroup ? item.group : null
            lastGroup = item.group
            return (
              <li key={`${item.group}-${index}`}>
                {header && <div className="palette-group">{header}</div>}
                <button
                  className={`palette-item ${index === current ? 'active' : ''}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(item)}
                >
                  <span className="palette-icon">
                    <Icon name={item.icon} size={16} />
                  </span>
                  <span className="palette-title">{item.title}</span>
                  {item.hint && <span className="palette-hint">{item.hint}</span>}
                </button>
              </li>
            )
          })}
          {items.length === 0 && <li className="palette-empty">Нічого не знайдено</li>}
        </ul>

        <div className="palette-foot">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> вибір
          </span>
          <span>
            <kbd>Enter</kbd> відкрити
          </span>
          <span>
            <kbd>Ctrl</kbd> <kbd>K</kbd> або <kbd>/</kbd> пошук
          </span>
        </div>
      </div>
    </div>
  )
}
