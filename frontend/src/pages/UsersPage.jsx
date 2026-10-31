import { useState } from 'react'
import { api } from '../api'
import CrudPanel from '../components/CrudPanel'
import PageHeader from '../components/PageHeader'
import { ROLES, roleLabel } from '../format'
import { useFetch } from '../hooks'

const COLUMNS = [
  { key: 'name', title: 'ПІБ' },
  { key: 'email', title: 'Email (логін)' },
  { key: 'role', title: 'Роль', render: (u) => roleLabel(u.role) },
  {
    key: 'is_active',
    title: 'Статус',
    render: (u) => <span className={`tag ${u.is_active ? 'ok' : 'danger'}`}>{u.is_active ? 'Активний' : 'Вимкнений'}</span>,
  },
]

const ROLE_FIELD = { name: 'role', label: 'Роль', type: 'select', required: true, options: ROLES }

const ADD_FIELDS = [
  { name: 'name', label: 'ПІБ', required: true },
  { name: 'email', label: 'Email (логін)', type: 'email', required: true },
  { name: 'password', label: 'Пароль (мін. 6 символів)', type: 'password', required: true },
  ROLE_FIELD,
]

// при редагуванні пароль необов'язковий, є перемикач активності
const EDIT_FIELDS = [
  { name: 'name', label: 'ПІБ', required: true },
  { name: 'email', label: 'Email (логін)', type: 'email', required: true },
  { name: 'password', label: 'Новий пароль (порожньо — не змінювати)', type: 'password' },
  ROLE_FIELD,
  { name: 'is_active', label: 'Активний (може входити в систему)', type: 'checkbox' },
]

/** Керування працівниками — лише для адміністратора. Видалення немає: працівника вимикають. */
export default function UsersPage() {
  const users = useFetch('/users')
  const [selected, setSelected] = useState(null)

  return (
    <>
      <PageHeader title="Співробітники" subtitle="Облікові записи працівників і їхні ролі" />
      <CrudPanel
      title="Співробітники"
      columns={COLUMNS}
      items={users.data}
      fields={ADD_FIELDS}
      editFields={EDIT_FIELDS}
      selectedId={selected?.id}
      onSelect={setSelected}
      onAdd={async (values) => {
        await api.post('/users', values)
        users.reload()
      }}
      onUpdate={async (user, values) => {
        await api.put(`/users/${user.id}`, values)
        users.reload()
      }}
      />
    </>
  )
}
