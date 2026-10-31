import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import FormModal from '../components/FormModal'
import Icon from '../components/Icon'
import { CLIENT_FIELDS, DEVICE_FIELDS } from '../format'
import { useFetch } from '../hooks'

/** Створення заявки: клієнт → його техніка → майстер → опис несправності. */
export default function NewOrderModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const [clientId, setClientId] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [masterId, setMasterId] = useState(String(user.id))
  const [problem, setProblem] = useState('')
  const [subForm, setSubForm] = useState(null) // 'client' | 'device' | null
  const [error, setError] = useState('')

  const clients = useFetch('/clients')
  const masters = useFetch('/masters')
  const devices = useFetch(clientId ? `/clients/${clientId}/devices` : null)

  async function addClient(values) {
    const client = await api.post('/clients', values)
    clients.reload()
    setClientId(String(client.id))
    setDeviceId('')
  }

  async function addDevice(values) {
    const device = await api.post(`/clients/${clientId}/devices`, values)
    devices.reload()
    setDeviceId(String(device.id))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    try {
      const result = await api.post('/orders', { device_id: deviceId, master_id: masterId, problem })
      onCreated(result.data.id)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="overlay">
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-head">
          <h3>Нова заявка</h3>
          <button type="button" className="icon-btn" title="Закрити" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        {error && <div className="alert">{error}</div>}

        <label className="field">
          <span>Клієнт *</span>
          <div className="row">
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value)
                setDeviceId('')
              }}
              required
            >
              <option value="">— оберіть —</option>
              {clients.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.phone})
                </option>
              ))}
            </select>
            <button type="button" className="btn" onClick={() => setSubForm('client')}>
              + Новий
            </button>
          </div>
        </label>

        <label className="field">
          <span>Техніка *</span>
          <div className="row">
            <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} required disabled={!clientId}>
              <option value="">— оберіть —</option>
              {devices.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.type} {d.brand} {d.model} {d.serial_number && `(S/N ${d.serial_number})`}
                </option>
              ))}
            </select>
            <button type="button" className="btn" disabled={!clientId} onClick={() => setSubForm('device')}>
              + Нова
            </button>
          </div>
        </label>

        <label className="field">
          <span>Майстер *</span>
          <select value={masterId} onChange={(e) => setMasterId(e.target.value)} required>
            {masters.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Опис несправності *</span>
          <textarea rows={4} value={problem} onChange={(e) => setProblem(e.target.value)} required />
        </label>

        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>
            Скасувати
          </button>
          <button type="submit" className="btn primary">
            Створити заявку
          </button>
        </div>
      </form>

      {subForm === 'client' && (
        <FormModal title="Новий клієнт" fields={CLIENT_FIELDS} onSubmit={addClient} onClose={() => setSubForm(null)} />
      )}
      {subForm === 'device' && (
        <FormModal title="Нова техніка" fields={DEVICE_FIELDS} onSubmit={addDevice} onClose={() => setSubForm(null)} />
      )}
    </div>
  )
}
