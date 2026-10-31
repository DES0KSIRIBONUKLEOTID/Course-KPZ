import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import FormModal from '../components/FormModal'
import Icon from '../components/Icon'
import OrderProgress from '../components/OrderProgress'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { money } from '../format'
import { useFetch } from '../hooks'

/** Картка заявки: роботи, запчастини, автоматичний розрахунок вартості, зміна статусу. */
export default function OrderPage() {
  const { id } = useParams()
  const { data, error, reload } = useFetch(`/orders/${id}`)
  const services = useFetch('/services')
  const parts = useFetch('/parts')

  const [modal, setModal] = useState(null) // 'work' | 'part' | null
  const [actionError, setActionError] = useState('')

  const order = data?.data
  if (error) return <div className="alert">{error}</div>
  if (!order) return <p className="muted">Завантаження...</p>

  // виконує дію з API, після чого перезавантажує заявку; помилки показує зверху
  async function act(action) {
    setActionError('')
    try {
      await action()
      reload()
      parts.reload() // на складі змінилась кількість
    } catch (err) {
      setActionError(err.message)
    }
  }

  function changeStatus(status) {
    if (status.value === 'cancelled' && !window.confirm('Скасувати заявку? Запчастини повернуться на склад.')) return
    act(() => api.patch(`/orders/${order.id}/status`, { status: status.value }))
  }

  const { totals } = order

  return (
    <>
      <Link to="/orders" className="breadcrumb no-print">
        <Icon name="back" size={16} /> Усі заявки
      </Link>

      <PageHeader
        title={
          <>
            Заявка №{order.id} <StatusBadge status={order.status} label={order.status_label} />
          </>
        }
        subtitle={`Створена ${order.created_at}${order.closed_at ? ` · закрита ${order.closed_at}` : ''}`}
        actions={
          <button className="btn" onClick={() => window.print()}>
            <Icon name="print" size={16} /> Друк
          </button>
        }
      />

      {actionError && <div className="alert">{actionError}</div>}

      <div className="card progress-card">
        <OrderProgress status={order.status} />
      </div>

      <div className="layout-2">
        <div className="stack">
          <section className="card flush">
            <div className="card-head">
              <h2>Виконані роботи</h2>
              {!order.is_closed && (
                <button className="btn small no-print" onClick={() => setModal('work')}>
                  <Icon name="plus" size={14} /> Додати
                </button>
              )}
            </div>
            <ItemsTable
              items={order.works}
              closed={order.is_closed}
              onRemove={(item) => act(() => api.delete(`/order-works/${item.id}`))}
            />
          </section>

          <section className="card flush">
            <div className="card-head">
              <h2>Використані запчастини</h2>
              {!order.is_closed && (
                <button className="btn small no-print" onClick={() => setModal('part')}>
                  <Icon name="plus" size={14} /> Додати
                </button>
              )}
            </div>
            <ItemsTable
              items={order.parts}
              closed={order.is_closed}
              onRemove={(item) => act(() => api.delete(`/order-parts/${item.id}`))}
            />
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>Інформація</h2>
            </div>
            <dl className="details">
              <dt>Клієнт</dt>
              <dd>
                {order.client.full_name}
                {order.client.discount > 0 && <span className="tag">знижка {order.client.discount}%</span>}
              </dd>
              <dt>Телефон</dt>
              <dd>{order.client.phone}</dd>
              <dt>Техніка</dt>
              <dd>{order.device.title}</dd>
              {order.device.serial_number && (
                <>
                  <dt>Серійний №</dt>
                  <dd>{order.device.serial_number}</dd>
                </>
              )}
              <dt>Майстер</dt>
              <dd>{order.master.name}</dd>
              <dt>Несправність</dt>
              <dd>{order.problem}</dd>
            </dl>
          </section>

          <section className="card totals-card">
            <div className="card-head">
              <h2>Вартість ремонту</h2>
            </div>
            <div className="sum-row">
              <span>Роботи</span>
              <b>{money(totals.works)}</b>
            </div>
            <div className="sum-row">
              <span>Запчастини</span>
              <b>{money(totals.parts)}</b>
            </div>
            {totals.discount_percent > 0 && (
              <div className="sum-row discount">
                <span>Знижка {totals.discount_percent}%</span>
                <b>−{money(totals.discount)}</b>
              </div>
            )}
            <div className="sum-total">
              <span>До сплати</span>
              <strong>{money(totals.total)}</strong>
            </div>
          </section>

          {order.allowed_statuses.length > 0 && (
            <section className="card no-print">
              <div className="card-head">
                <h2>Змінити статус</h2>
              </div>
              <div className="status-actions">
                {order.allowed_statuses.map((status) => (
                  <button
                    key={status.value}
                    className={`btn ${status.value === 'cancelled' ? 'danger' : ''}`}
                    onClick={() => changeStatus(status)}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {modal === 'work' && (
        <FormModal
          title="Додати роботу"
          fields={[
            {
              name: 'service_id',
              label: 'Послуга',
              type: 'select',
              required: true,
              options: (services.data ?? []).map((s) => ({ value: s.id, label: `${s.name} — ${money(s.price)}` })),
            },
            { name: 'quantity', label: 'Кількість', type: 'number', min: 1, default: 1, required: true },
          ]}
          submitText="Додати"
          onSubmit={(values) => api.post(`/orders/${order.id}/works`, values).then(reload)}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'part' && (
        <FormModal
          title="Додати запчастину"
          fields={[
            {
              name: 'part_id',
              label: 'Запчастина',
              type: 'select',
              required: true,
              options: (parts.data ?? []).map((p) => ({
                value: p.id,
                label: `${p.name} — ${money(p.price)} (на складі: ${p.stock})`,
              })),
            },
            { name: 'quantity', label: 'Кількість', type: 'number', min: 1, default: 1, required: true },
          ]}
          submitText="Додати"
          onSubmit={(values) =>
            api.post(`/orders/${order.id}/parts`, values).then(() => {
              reload()
              parts.reload()
            })
          }
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}

/** Таблиця робіт або запчастин у заявці. */
function ItemsTable({ items, closed, onRemove }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Назва</th>
            <th className="num">Ціна</th>
            <th className="num">К-сть</th>
            <th className="num">Сума</th>
            {!closed && <th className="actions-col no-print" />}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td className="num">{money(item.price)}</td>
              <td className="num">{item.quantity}</td>
              <td className="num strong">{money(item.sum)}</td>
              {!closed && (
                <td className="actions-col no-print">
                  <button className="icon-btn danger" title="Видалити" onClick={() => onRemove(item)}>
                    <Icon name="trash" size={16} />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="empty">
                Немає записів
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
