import { useEffect, useState } from 'react'
import { api } from './api'

/**
 * Завантажує дані з API при зміні path/params.
 * Якщо path === null — нічого не завантажує.
 * Повертає { data, error, loading, reload }.
 */
export function useFetch(path, params) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [version, setVersion] = useState(0) // збільшується при reload()
  const paramsKey = JSON.stringify(params ?? {})

  useEffect(() => {
    if (!path) {
      setData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    api
      .get(path, params)
      .then((result) => {
        if (cancelled) return
        setData(result)
        setError('')
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramsKey, version])

  return { data, error, loading, reload: () => setVersion((v) => v + 1) }
}

/** Повертає значення із затримкою — щоб не робити запит на кожну натиснуту літеру. */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
