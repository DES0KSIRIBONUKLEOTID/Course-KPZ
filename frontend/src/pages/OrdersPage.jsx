import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { initials, money } from '../format'
import { useDebounce, useFetch } from '../hooks'
import NewOrderModal from './NewOrderModal'

/** Список заявок з пошуком, фільтрами за статусом і датою та пагінацією. */
export default function OrdersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)

  const debouncedSearch = useDebounce(search)
  const statuses = useFetch('/order-statuses')
  const orders = useFetch('/orders', { search: debouncedSearch, status, from, to, page })

  const meta = orders.data?.meta

  // будь-яка зміна фільтра повертає на першу сторінку
  const filter = (setter) => (event) => {
    setter(event.target.value)
    setPage(1)
  }

  function resetFilters() {
    setSearch('')
    setStatus('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="Заявки на ремонт"
        subtitle="Пошук і фільтрація заявок, перегляд статусів та вартості"
        actions={
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> Нова заявка
          </button>
        }
      />

      <div className="card filters">
        <div className="input-icon grow">
          <Icon name="search" size={16} />
          <input
            placeholder="Пошук: №, клієнт, телефон, техніка, серійний номер..."
            value={search}
            onChange={filter(setSearch)}
          />
        </div>
        <select value={status} onChange={filter(setStatus)}>
          <option value="">Усі статуси</option>
          {statuses.data?.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <label className="date-field">
          <span>з</span>
          <input type="date" value={from} onChange={filter(setFrom)} />
        </label>
        <label className="date-field">
          <span>по</span>
          <input type="date" value={to} onChange={filter(setTo)} />
        </label>
        <button className="btn ghost" onClick={resetFilters}>
          Скинути
        </button>
      </div>

      {orders.error && <div className="alert">{orders.error}</div>}

      <section className="card flush">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>№</th>
                <th>Клієнт</th>
                <th>Техніка</th>
                <th>Майстер</th>
                <th>Статус</th>
                <th className="hide-md">Створено</th>
                <th className="num">Сума</th>
              </tr>
            </thead>
            <tbody>
              {orders.data?.data.map((order) => (
                <tr key={order.id} className="clickable" onClick={() => navigate(`/orders/${order.id}`)}>
                  <td className="order-no">№{order.id}</td>
                  <td>
                    <div className="person">
                      <span className="avatar sm">{initials(order.client.full_name)}</span>
                      <div>
                        {order.client.full_name}
                        <div className="muted">{order.client.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="nowrap">{order.device.title}</td>
                  <td className="nowrap">{order.master.name}</td>
                  <td>
                    <StatusBadge status={order.status} label={order.status_label} />
                  </td>
                  <td className="muted nowrap hide-md">{order.created_at}</td>
                  <td className="num strong">{money(order.totals.total)}</td>
                </tr>
              ))}
              {orders.data?.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    Заявок не знайдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {meta && meta.last_page > 1 && (
        <div className="pager">
          <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Назад
          </button>
          <span className="muted">
            Сторінка {meta.current_page} з {meta.last_page} · усього {meta.total}
          </span>
          <button className="btn" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>
            Далі →
          </button>
        </div>
      )}

      {creating && (
        <NewOrderModal onClose={() => setCreating(false)} onCreated={(id) => navigate(`/orders/${id}`)} />
      )}
    </>
  )
}
