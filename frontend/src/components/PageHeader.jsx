/** Заголовок сторінки: назва, підзаголовок і кнопки справа. */
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions no-print">{actions}</div>}
    </div>
  )
}
