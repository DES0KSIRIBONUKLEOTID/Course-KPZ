import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import Skeleton from '../components/Skeleton'
import StatusBadge from '../components/StatusBadge'
import { duration, initials, money } from '../format'
import { useDebounce, useFetch } from '../hooks'
import NewOrderModal from './NewOrderModal'

/** Список заявок з пошуком, фільтрами за статусом і датою та пагінацією. */
export default function OrdersPage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)

  const debouncedSearch = useDebounce(search)
  const statuses = useFetch('/order-statuses')
  const orders = useFetch('/orders', { search: debouncedSearch, status, from, to, page })
  const counts = useFetch('/order-counts')

  const meta = orders.data?.meta

  // посилання зі швидкого пошуку: ?new=1 відкриває форму заявки, ?search=... підставляє фільтр
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get('new') && isAdmin) setCreating(true)
    if (params.get('search') !== null) {
      setSearch(params.get('search'))
      setPage(1)
    }
    if (params.toString()) setParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

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
        title={isAdmin ? 'Заявки на ремонт' : 'Мої заявки'}
        subtitle={
          isAdmin
            ? 'Пошук і фільтрація заявок, перегляд статусів та вартості'
            : 'Заявки, призначені вам. Пошук, фільтри, статуси та вартість'
        }
        actions={
          isAdmin && (
            <button className="btn primary" onClick={() => setCreating(true)}>
              <Icon name="plus" size={16} /> Нова заявка
            </button>
          )
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

      <div className="chips" role="tablist">
        {[{ value: '', label: 'Усі' }, ...(statuses.data ?? [])].map((s) => (
          <button
            key={s.value}
            role="tab"
            aria-selected={status === s.value}
            className={`chip ${status === s.value ? 'active' : ''}`}
            onClick={() => {
              setStatus(s.value)
              setPage(1)
            }}
          >
            {s.value && <span className={`chip-dot badge-${s.value}`} />}
            {s.label}
            <b>{counts.data?.[s.value || 'all'] ?? 0}</b>
          </button>
        ))}
      </div>

      {orders.error && <div className="alert">{orders.error}</div>}

      <section className="card flush">
        {orders.loading && !orders.data && <Skeleton rows={6} cols={6} />}
        <div className="table-wrap" hidden={!orders.data}>
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
                  <td>
                    <span className="order-no">№{order.id}</span>
                  </td>
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
                    {order.status === 'in_repair' && (
                      <div className={`time-chip ${order.is_overdue ? 'overdue' : ''}`} title="Час у статусі «В ремонті»">
                        <Icon name="clock" size={13} /> {duration(order.status_seconds)}
                        {order.is_overdue && ' · затягнуто'}
                      </div>
                    )}
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
