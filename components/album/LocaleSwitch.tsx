import Link from 'next/link'

const LOCALES = [
  { code: 'en', label: 'EN', href: '/album' },
  { code: 'pt', label: 'PT', href: '/pt/album' },
  { code: 'es', label: 'ES', href: '/es/album' },
]

export default function LocaleSwitch({ locale }: { locale: string }) {
  return (
    <nav className="album-locales" aria-label="Language">
      {LOCALES.map(l => (
        <Link key={l.code} href={l.href} className={`pill${l.code === locale ? ' pill--active' : ''}`}>
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
