import { useState } from 'react'
import { api } from '../api'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import { dateInput, money } from '../format'

/** Звіт за період: заявки за статусами, виручка, майстри, популярні послуги. */
export default function ReportsPage() {
  // за замовчуванням — поточний місяць
  const [from, setFrom] = useState(() => {
    const now = new Date()
    return dateInput(new Date(now.getFullYear(), now.getMonth(), 1))
  })
  const [to, setTo] = useState(() => dateInput(new Date()))
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')

  async function build(event) {
    event.preventDefault()
    setError('')
    try {
      setReport(await api.get('/reports/summary', { from, to }))
    } catch (err) {
      setReport(null)
      setError(err.message)
    }
  }

  const maxCount = report ? Math.max(1, ...report.by_status.map((s) => s.count)) : 1

  return (
    <>
      <PageHeader
        title="Звіти"
        subtitle="Статистика заявок і виручки за обраний період"
        actions={
          report && (
            <button className="btn" onClick={() => window.print()}>
              <Icon name="print" size={16} /> Друк
            </button>
          )
        }
      />

      <form className="card filters no-print" onSubmit={build}>
        <label className="date-field">
          <span>З</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </label>
        <label className="date-field">
          <span>По</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
        </label>
        <button className="btn primary">Сформувати звіт</button>
      </form>

      {error && <div className="alert">{error}</div>}

      {!report && !error && <p className="muted center">Оберіть період і натисніть «Сформувати звіт»</p>}

      {report && (
        <>
          <p className="muted">
            Період: {report.from} — {report.to}
          </p>

          <div className="stats">
            <Stat icon="file" color="blue" title="Створено заявок" value={report.created_count} />
            <Stat icon="check" color="green" title="Видано заявок" value={report.issued_count} />
            <Stat icon="money" color="violet" title="Виручка" value={money(report.revenue)} />
            <Stat icon="reports" color="amber" title="Середній чек" value={money(report.average_check)} />
          </div>

          <p className="muted">
            Виручка складається з робіт {money(report.works_sum)} і запчастин {money(report.parts_sum)} за вирахуванням
            знижок {money(report.discount_sum)}.
          </p>

          <div className="grid-3">
            <section className="card">
              <div className="card-head">
                <h2>Створені заявки за статусами</h2>
              </div>
              <ul className="bars">
                {report.by_status.map((s) => (
                  <li key={s.label}>
                    <span className="bar-label">{s.label}</span>
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: `${(s.count / maxCount) * 100}%` }} />
                    </span>
                    <b>{s.count}</b>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card flush">
              <div className="card-head">
                <h2>Видані заявки по майстрах</h2>
              </div>
              <SimpleTable
                head={['Майстер', 'Заявок', 'Виручка']}
                rows={report.by_master.map((m) => [m.master, m.issued_count, money(m.revenue)])}
              />
            </section>

            <section className="card flush">
              <div className="card-head">
                <h2>Найпопулярніші послуги</h2>
              </div>
              <SimpleTable
                head={['Послуга', 'К-сть', 'Сума']}
                rows={report.top_services.map((s) => [s.name, s.quantity, money(s.amount)])}
              />
            </section>
          </div>
        </>
      )}
    </>
  )
}

function Stat({ icon, color, title, value }) {
  return (
    <div className={`stat stat-${color}`}>
      <span className="stat-icon">
        <Icon name={icon} size={22} />
      </span>
      <div>
        <div className="muted">{title}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  )
}

function SimpleTable({ head, rows }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h} className={i > 0 ? 'num' : ''}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={j > 0 ? 'num' : ''}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={head.length} className="empty">
                Немає даних
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
