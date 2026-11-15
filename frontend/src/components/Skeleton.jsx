/** Заглушка-скелетон з мерехтінням, поки дані завантажуються. rows - кількість рядків. */
export default function Skeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="skeleton-table" aria-busy="true">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="skeleton-row" style={{ animationDelay: `${r * 60}ms` }}>
          {Array.from({ length: cols }, (_, c) => (
            <span key={c} className="skeleton" style={{ width: `${c === 0 ? 8 : 12 + ((r + c) % 3) * 6}%` }} />
          ))}
        </div>
      ))}
    </div>
  )
}
