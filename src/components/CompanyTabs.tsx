import Link from 'next/link'

export function CompanyTabs({ active }: { active: 'buyers' | 'companies' }) {
  return (
    <nav aria-label="Buyers and companies" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {[
        { id: 'buyers', href: '/buyers', label: 'Buyers' },
        { id: 'companies', href: '/buyers?tab=companies', label: 'Production Companies / Distributors' },
      ].map((tab) => (
        <Link key={tab.id} href={tab.href} aria-current={active === tab.id ? 'page' : undefined}
          className={`rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-600 ${active === tab.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
