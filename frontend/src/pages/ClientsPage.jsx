import { useState } from 'react'
import { api } from '../api'
import CrudPanel from '../components/CrudPanel'
import PageHeader from '../components/PageHeader'
import { CLIENT_FIELDS, DEVICE_FIELDS } from '../format'
import { useFetch } from '../hooks'

const CLIENT_COLUMNS = [
  { key: 'full_name', title: 'ПІБ' },
  { key: 'phone', title: 'Телефон' },
  { key: 'email', title: 'Email' },
  { key: 'discount', title: 'Знижка, %' },
]

const DEVICE_COLUMNS = [
  { key: 'type', title: 'Тип' },
  { key: 'brand', title: 'Виробник' },
  { key: 'model', title: 'Модель' },
  { key: 'serial_number', title: 'Серійний номер' },
]

/** Клієнти (зверху) і техніка вибраного клієнта (знизу). */
export default function ClientsPage() {
  const clients = useFetch('/clients')
  const [selected, setSelected] = useState(null)
  const devices = useFetch(selected ? `/clients/${selected.id}/devices` : null)

  return (
    <>
      <PageHeader title="Клієнти і техніка" subtitle="Оберіть клієнта в таблиці, щоб побачити та змінити його техніку" />

      <CrudPanel
        title="Клієнти"
        columns={CLIENT_COLUMNS}
        items={clients.data}
        fields={CLIENT_FIELDS}
        selectedId={selected?.id}
        onSelect={setSelected}
        onAdd={async (values) => {
          await api.post('/clients', values)
          clients.reload()
        }}
        onUpdate={async (client, values) => {
          await api.put(`/clients/${client.id}`, values)
          clients.reload()
        }}
        onDelete={async (client) => {
          await api.delete(`/clients/${client.id}`)
          setSelected(null)
          clients.reload()
        }}
      />

      <CrudPanel
        title={selected ? `Техніка клієнта: ${selected.full_name}` : 'Техніка (оберіть клієнта вище)'}
        columns={DEVICE_COLUMNS}
        items={selected ? devices.data : []}
        fields={DEVICE_FIELDS}
        addDisabled={!selected}
        onAdd={async (values) => {
          await api.post(`/clients/${selected.id}/devices`, values)
          devices.reload()
        }}
        onUpdate={async (device, values) => {
          await api.put(`/devices/${device.id}`, values)
          devices.reload()
        }}
        onDelete={async (device) => {
          await api.delete(`/devices/${device.id}`)
          devices.reload()
        }}
      />
    </>
  )
}
