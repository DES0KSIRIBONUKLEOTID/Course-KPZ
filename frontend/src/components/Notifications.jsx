import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { duration } from '../format'
import { useFetch } from '../hooks'
import Icon from './Icon'

/**
 * Дзвіночок зі сповіщеннями про затягнутий ремонт.
 * Список оновлюється раз на хвилину та під час переходу на іншу сторінку.
 * Майстер бачить лише свої заявки, адміністратор усі (це вирішує сервер).
 */
export default function Notifications() {
  const { data, reload } = useFetch('/overdue-orders')
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const items = data?.data ?? []

  useEffect(() => {
    const timer = setInterval(reload, 60000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    reload()
    setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // кількість затягнутих заявок видно і у вкладці браузера
  useEffect(() => {
    document.title = items.length ? `(${items.length}) Сервісний центр` : 'Сервісний центр'
  }, [items.length])

  return (
    <div className="notify">
      <button className={`icon-btn ${items.length > 0 ? 'has' : ''}`} title="Сповіщення" onClick={() => setOpen(!open)}>
        <Icon name="bell" />
        {items.length > 0 && <span className="count">{items.length}</span>}
      </button>

      {open && (
        <div className="popover">
          <h4>Ремонт затягується</h4>
          {items.length === 0 && <p className="muted">Затримок немає. Усі ремонти в межах ліміту.</p>}
          {items.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="notify-item">
              <span className="notify-title">
                №{order.id} {order.device.title}
              </span>
              <span className="muted">{order.client.full_name}</span>
              <span className="late">
                <Icon name="clock" size={13} /> в ремонті {duration(order.status_seconds)} (ліміт {order.overdue_after_hours} год.)
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
