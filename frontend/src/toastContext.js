import { createContext, useContext } from 'react'

// Контекст сповіщень-«тостів». Провайдер (ToastProvider) лежить окремо, щоб файл містив лише не-компоненти.
export const ToastContext = createContext(() => {})

/** Повертає функцію toast(текст, тип): тип 'ok' (за замовчуванням) або 'error'. */
export const useToast = () => useContext(ToastContext)
