import Icon from './Icon'

// Основний шлях заявки. «Очікує запчастини» — це пауза на кроці «Ремонт».
const STEPS = [
  { keys: ['new'], label: 'Нова' },
  { keys: ['diagnostics'], label: 'Діагностика' },
  { keys: ['in_repair', 'waiting_parts'], label: 'Ремонт' },
  { keys: ['ready'], label: 'Готова' },
  { keys: ['issued'], label: 'Видана' },
]

/** Смужка прогресу заявки. Для скасованої заявки показує повідомлення. */
export default function OrderProgress({ status }) {
  if (status === 'cancelled') {
    return <div className="progress-cancelled">Заявку скасовано</div>
  }

  const current = STEPS.findIndex((step) => step.keys.includes(status))

  return (
    <ol className="stepper">
      {STEPS.map((step, index) => {
        const state = index < current || status === 'issued' ? 'done' : index === current ? 'current' : ''
        const label = status === 'waiting_parts' && index === current ? 'Очікує запчастини' : step.label
        return (
          <li key={step.label} className={state}>
            <span className="step-dot">{state === 'done' ? <Icon name="check" size={14} /> : index + 1}</span>
            <span className="step-label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
