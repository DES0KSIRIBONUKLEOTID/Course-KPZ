import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import CrudPanel from '../components/CrudPanel'
import PageHeader from '../components/PageHeader'
import { money } from '../format'
import { useFetch } from '../hooks'

const SERVICE_FIELDS = [
  { name: 'name', label: 'Назва', required: true },
  { name: 'price', label: 'Ціна, грн', type: 'number', min: 0, step: 0.01, required: true },
]

const PART_FIELDS = [
  ...SERVICE_FIELDS,
  { name: 'stock', label: 'Кількість на складі', type: 'number', min: 0, required: true },
]

const SERVICE_COLUMNS = [
  { key: 'name', title: 'Назва' },
  { key: 'price', title: 'Ціна', render: (s) => money(s.price) },
]

const PART_COLUMNS = [
  ...SERVICE_COLUMNS,
  {
    key: 'stock',
    title: 'На складі',
    render: (p) =>
      p.stock === 0 ? (
        <span className="tag danger">немає</span>
      ) : p.stock <= 3 ? (
        <span className="tag warn">{p.stock} шт. — мало</span>
      ) : (
        `${p.stock} шт.`
      ),
  },
]

/** Прайс-лист робіт і склад запчастин. Змінювати може лише адміністратор. */
export default function CatalogPage() {
  const { isAdmin } = useAuth()
  const services = useFetch('/services')
  const parts = useFetch('/parts')
  const [selectedService, setSelectedService] = useState(null)
  const [selectedPart, setSelectedPart] = useState(null)

  return (
    <>
      <PageHeader
        title="Послуги і склад"
        subtitle={isAdmin ? 'Прайс-лист робіт і склад запчастин' : 'Прайс-лист робіт і склад запчастин (лише перегляд)'}
      />

      <CrudPanel
        title="Прайс-лист послуг"
        columns={SERVICE_COLUMNS}
        items={services.data}
        fields={SERVICE_FIELDS}
        canEdit={isAdmin}
        selectedId={selectedService?.id}
        onSelect={setSelectedService}
        onAdd={async (values) => {
          await api.post('/services', values)
          services.reload()
        }}
        onUpdate={async (service, values) => {
          await api.put(`/services/${service.id}`, values)
          services.reload()
        }}
        onDelete={async (service) => {
          await api.delete(`/services/${service.id}`)
          setSelectedService(null)
          services.reload()
        }}
      />

      <CrudPanel
        title="Склад запчастин"
        columns={PART_COLUMNS}
        items={parts.data}
        fields={PART_FIELDS}
        canEdit={isAdmin}
        selectedId={selectedPart?.id}
        onSelect={setSelectedPart}
        onAdd={async (values) => {
          await api.post('/parts', values)
          parts.reload()
        }}
        onUpdate={async (part, values) => {
          await api.put(`/parts/${part.id}`, values)
          parts.reload()
        }}
        onDelete={async (part) => {
          await api.delete(`/parts/${part.id}`)
          setSelectedPart(null)
          parts.reload()
        }}
      />
    </>
  )
}
