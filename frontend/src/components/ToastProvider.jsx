import { useCallback, useRef, useState } from 'react'
import { ToastContext } from '../toastContext'
import Icon from './Icon'

/** Показує короткі повідомлення про успішні дії в правому нижньому куті (зникають самі через 3 секунди). */
export default function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const counter = useRef(0)

  const toast = useCallback((text, type = 'ok') => {
    const id = ++counter.current
    setItems((list) => [...list, { id, text, type }])
    setTimeout(() => setItems((list) => list.filter((item) => item.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts no-print" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast ${item.type}`}>
            <span className="toast-icon">
              <Icon name={item.type === 'error' ? 'x' : 'check'} size={16} />
            </span>
            {item.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
