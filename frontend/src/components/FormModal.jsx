import { useState } from 'react'
import Icon from './Icon'

/**
 * Універсальне модальне вікно з формою.
 *
 * fields: [{ name, label, type?, required?, options?, default?, ... }]
 *   type: text (за замовчуванням), number, email, password, textarea, select, checkbox
 *   options (для select): [{ value, label }]
 * initial:  початкові значення { name: value }
 * onSubmit: async (values) => ... ; якщо кине помилку — вона покажеться у формі
 */
export default function FormModal({ title, fields, initial = {}, onSubmit, onClose, submitText = 'Зберегти' }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      fields.map((f) => [f.name, initial[f.name] ?? f.default ?? (f.type === 'checkbox' ? false : '')]),
    ),
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const setValue = (name, value) => setValues((current) => ({ ...current, [name]: value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSubmit(values)
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="overlay">
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" title="Закрити" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        {error && <div className="alert">{error}</div>}

        {fields.map((field) => (
          <label key={field.name} className="field">
            <span>
              {field.label}
              {field.required && ' *'}
            </span>
            <Input field={field} value={values[field.name]} onChange={(v) => setValue(field.name, v)} />
          </label>
        ))}

        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>
            Скасувати
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {submitText}
          </button>
        </div>
      </form>
    </div>
  )
}

function Input({ field, value, onChange }) {
  const { type = 'text', options, ...rest } = field

  if (type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} required={rest.required}>
        <option value="">— оберіть —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }
  if (type === 'textarea') {
    return <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} required={rest.required} />
  }
  if (type === 'checkbox') {
    return <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
  }
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={rest.required}
      placeholder={rest.placeholder}
      min={rest.min}
      max={rest.max}
      step={type === 'number' ? (rest.step ?? 1) : undefined}
    />
  )
}
