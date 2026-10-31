export const money = (value) => `${Number(value).toFixed(2)} грн`

// Дата у форматі РРРР-ММ-ДД для <input type="date"> (за локальним часом)
export function dateInput(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Ініціали для аватарки: «Коваленко Олег» → «КО»
export const initials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')

export const ROLES = [
  { value: 'admin', label: 'Адміністратор' },
  { value: 'master', label: 'Майстер' },
]

export const roleLabel = (role) => ROLES.find((r) => r.value === role)?.label ?? role

// Поля форм клієнта і техніки (використовуються на кількох сторінках)
export const CLIENT_FIELDS = [
  { name: 'full_name', label: 'ПІБ', required: true },
  { name: 'phone', label: 'Телефон', required: true, placeholder: '+380501234567' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'discount', label: 'Знижка, %', type: 'number', min: 0, max: 100, default: 0 },
]

const DEVICE_TYPES = ['Ноутбук', 'Комп’ютер', 'Монітор', 'Принтер', 'Смартфон', 'Планшет', 'Інше']

export const DEVICE_FIELDS = [
  {
    name: 'type',
    label: 'Тип',
    type: 'select',
    required: true,
    options: DEVICE_TYPES.map((t) => ({ value: t, label: t })),
  },
  { name: 'brand', label: 'Виробник', required: true },
  { name: 'model', label: 'Модель', required: true },
  { name: 'serial_number', label: 'Серійний номер' },
]
