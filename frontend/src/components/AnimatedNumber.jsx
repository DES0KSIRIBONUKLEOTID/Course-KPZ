import { useEffect, useRef, useState } from 'react'

/**
 * Число, яке плавно «докручується» від попереднього значення до нового (за 0,8 с).
 * format - функція форматування, наприклад money. Якщо користувач вимкнув анімації, число показується одразу.
 */
export default function AnimatedNumber({ value, format = (n) => String(Math.round(n)) }) {
  const [shown, setShown] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = performance.now()
    const begin = from.current
    const duration = reduce ? 0 : 800
    let frame

    const tick = (now) => {
      const t = duration === 0 ? 1 : Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // швидкий старт, плавне гальмування
      const current = begin + (value - begin) * eased
      from.current = current
      setShown(current)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <>{format(shown)}</>
}
