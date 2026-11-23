import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import AnimatedNumber from '../components/AnimatedNumber'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import { dateInput, money } from '../format'

/** Звіт за період: загальні показники, яка техніка ремонтується найчастіше, клієнти, послуги, запчастини, динаміка. */
export default function ReportsPage() {
  const { isAdmin } = useAuth()
  // за замовчуванням - поточний місяць
  const [from, setFrom] = useState(() => {
    const now = new Date()
    return dateInput(new Date(now.getFullYear(), now.getMonth(), 1))
  })
  const [to, setTo] = useState(() => dateInput(new Date()))
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      setReport(await api.get('/reports/summary', { from, to }))
    } catch (err) {
      setReport(null)
      setError(err.message)
    }
  }

  // звіт за поточний місяць формується одразу під час відкриття сторінки
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function build(event) {
    event.preventDefault()
    load()
  }

  const maxCount = report ? Math.max(1, ...report.by_status.map((s) => s.count)) : 1

  return (
    <>
      <PageHeader
        title="Звіти"
        subtitle={
          isAdmin ? 'Статистика заявок і виручки за обраний період' : 'Статистика ваших заявок і виручки за обраний період'
        }
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

      {!report && !error && <p className="muted center">Формування звіту...</p>}

      {report && (
        <>
          <p className="muted">
            Період: {report.from} - {report.to}
          </p>

          <div className="stats">
            <Stat icon="file" color="blue" title="Створено заявок" number={report.created_count} />
            <Stat icon="check" color="green" title="Видано заявок" number={report.issued_count} />
            <Stat icon="money" color="violet" title="Виручка" number={report.revenue} format={money} />
            <Stat icon="reports" color="amber" title="Середній чек" number={report.average_check} format={money} />
            <Stat
              icon="clock"
              color="blue"
              title="Середній час ремонту"
              value={report.avg_repair_hours === null ? 'немає даних' : hours(report.avg_repair_hours)}
            />
            <Stat
              icon="x"
              color="red"
              title="Скасовано"
              value={`${report.cancelled_count} (${report.cancel_rate}%)`}
            />
            <Stat icon="bell" color="amber" title="Затягнуті ремонти зараз" number={report.overdue_now} />
            <Stat
              icon="wrench"
              color="violet"
              title="Найчастіше ремонтують"
              value={report.by_device_type[0]?.name ?? 'немає даних'}
            />
          </div>

          <p className="muted">
            Виручка складається з робіт {money(report.works_sum)} і запчастин {money(report.parts_sum)} за вирахуванням
            знижок {money(report.discount_sum)}.
          </p>

          <section className="card">
            <div className="card-head">
              <h2>Динаміка надходження заявок</h2>
              <span className="muted">кількість створених заявок за період</span>
            </div>
            <Columns rows={report.daily} />
          </section>

          <div className="grid-3">
            <section className="card">
              <div className="card-head">
                <h2>Яка техніка ремонтується найчастіше</h2>
              </div>
              <BarList rows={report.by_device_type} unit="заявок" />
            </section>

            <section className="card">
              <div className="card-head">
                <h2>Найчастіші моделі</h2>
              </div>
              <BarList rows={report.top_models} unit="заявок" />
            </section>

            <section className="card">
              <div className="card-head">
                <h2>Найчастіші виробники</h2>
              </div>
              <BarList rows={report.top_brands} unit="заявок" />
            </section>

            <section className="card">
              <div className="card-head">
                <h2>Найактивніші клієнти</h2>
              </div>
              <BarList rows={report.top_clients} unit="заявок" />
            </section>

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
                <h2>Виручка за типами техніки</h2>
              </div>
              <SimpleTable
                head={['Тип', 'Видано', 'Виручка']}
                rows={report.revenue_by_type.map((t) => [t.name, t.count, money(t.amount)])}
              />
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

            <section className="card flush">
              <div className="card-head">
                <h2>Найчастіше використані запчастини</h2>
              </div>
              <SimpleTable
                head={['Запчастина', 'К-сть', 'Сума']}
                rows={report.top_parts.map((p) => [p.name, p.quantity, money(p.amount)])}
              />
            </section>
          </div>
        </>
      )}
    </>
  )
}

// Години у зручному вигляді: «10 год.» або «2 дн. 4 год.»
function hours(value) {
  if (value < 1) return `${Math.round(value * 60)} хв.`
  if (value < 48) return `${value} год.`
  return `${Math.floor(value / 24)} дн. ${Math.round(value % 24)} год.`
}

function Stat({ icon, color, title, value, number, format }) {
  return (
    <div className={`stat stat-${color}`}>
      <span className="stat-icon">
        <Icon name={icon} size={22} />
      </span>
      <div>
        <div className="muted">{title}</div>
        <div className="stat-value">{number !== undefined ? <AnimatedNumber value={Number(number)} format={format} /> : value}</div>
      </div>
    </div>
  )
}

/** Горизонтальні смужки зі шкалою: rows = [{ name, count }]. */
function BarList({ rows, unit }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  if (rows.length === 0) return <p className="muted">Немає даних за цей період</p>
  return (
    <ul className="bars wide">
      {rows.map((r) => (
        <li key={r.name} title={`${r.name}: ${r.count} ${unit}`}>
          <span className="bar-label">{r.name}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
          </span>
          <b>{r.count}</b>
        </li>
      ))}
    </ul>
  )
}

/** Стовпчики по днях (або місяцях): rows = [{ label, count }]. */
function Columns({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  // підписи показуємо не для кожного стовпчика, щоб вони не злипались
  const step = Math.ceil(rows.length / 12)
  return (
    <div className="columns">
      {rows.map((r, i) => (
        <div key={r.label} className="column" title={`${r.label}: ${r.count}`}>
          <span className="column-value">{r.count > 0 ? r.count : ''}</span>
          <span className="column-bar" style={{ height: `${(r.count / max) * 100}%` }} />
          <span className="column-label">{i % step === 0 ? r.label : ''}</span>
        </div>
      ))}
    </div>
  )
}

function SimpleTable({ head, rows }) {
  return (
    <div className="table-wrap">
      <table className="table stack">
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
                <td key={j} className={j > 0 ? 'num' : ''} data-label={head[j]}>
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
