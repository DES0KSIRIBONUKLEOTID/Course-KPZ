import { useState } from 'react'
import FormModal from './FormModal'
import Icon from './Icon'

/**
 * Універсальна таблиця з пошуком і кнопками редагування/видалення в кожному рядку.
 * Сама дані не завантажує: список (items) і дії (onAdd, onUpdate, onDelete) передає сторінка.
 *
 * columns:    [{ key, title, render?(item) }]
 * fields:     поля форми додавання (див. FormModal); editFields — для редагування, якщо відрізняються
 * canEdit:    false — кнопки керування приховані (лише перегляд)
 * onDelete:   якщо не передано, кнопки видалення немає
 * onSelect:   викликається при кліку на рядок; selectedId підсвічує вибраний рядок
 */
export default function CrudPanel({
  title,
  columns,
  items,
  fields,
  editFields = fields,
  canEdit = true,
  addDisabled = false,
  onAdd,
  onUpdate,
  onDelete,
  deleteText = 'Видалити',
  onSelect,
  selectedId,
}) {
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // { item } — редагування, {} — додавання
  const [error, setError] = useState('')

  // пошук за текстом усіх колонок (без урахування регістру)
  const visible = (items ?? []).filter((item) =>
    columns
      .map((c) => {
        const shown = c.render?.(item)
        return typeof shown === 'string' ? shown : (item[c.key] ?? '')
      })
      .join(' ')
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  )

  async function handleDelete(item) {
    if (!window.confirm(`${deleteText}: «${item.name ?? item.full_name ?? item.model ?? item.id}»?`)) return
    try {
      setError('')
      await onDelete(item)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>{title}</h2>
        <div className="card-tools">
          <div className="input-icon">
            <Icon name="search" size={16} />
            <input placeholder="Пошук..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {canEdit && (
            <button className="btn primary" disabled={addDisabled} onClick={() => setModal({})}>
              <Icon name="plus" size={16} /> Додати
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.title}</th>
              ))}
              {canEdit && <th className="actions-col" />}
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr
                key={item.id}
                className={`${onSelect ? 'clickable' : ''} ${item.id === selectedId ? 'selected' : ''}`}
                onClick={() => onSelect?.(item)}
                onDoubleClick={() => canEdit && setModal({ item })}
              >
                {columns.map((c) => (
                  <td key={c.key}>{c.render ? c.render(item) : item[c.key]}</td>
                ))}
                {canEdit && (
                  <td className="actions-col">
                    <button
                      className="icon-btn"
                      title="Змінити"
                      onClick={(e) => {
                        e.stopPropagation()
                        setModal({ item })
                      }}
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    {onDelete && (
                      <button
                        className="icon-btn danger"
                        title={deleteText}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(item)
                        }}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {items && visible.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="empty">
                  Записів немає
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <FormModal
          title={modal.item ? 'Редагування' : 'Новий запис'}
          fields={modal.item ? editFields : fields}
          initial={modal.item ?? {}}
          onSubmit={(values) => (modal.item ? onUpdate(modal.item, values) : onAdd(values))}
          onClose={() => setModal(null)}
        />
      )}
    </section>
  )
}
