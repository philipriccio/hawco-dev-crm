const seriesRates = [
  {
    work: 'Script with outline required',
    halfHour: '$10,546',
    hour: '$21,088',
    note: 'Use as main budget floor for a commissioned episode script.',
  },
  {
    work: 'Script from existing story/outline, no outline stage',
    halfHour: '$8,784',
    hour: '$17,573',
    note: 'Lower floor when the writer proceeds directly to first draft.',
  },
  {
    work: 'Story / screen story',
    halfHour: '$1,756',
    hour: '$3,516',
    note: 'Story-only step; do not treat as full script work.',
  },
  {
    work: 'Rewrite',
    halfHour: '$3,075',
    hour: '$6,152',
    note: 'Commissioned rewrite after script material exists.',
  },
  {
    work: 'Polish',
    halfHour: '$1,536',
    hour: '$3,075',
    note: 'Light final polish, not structural rewrite.',
  },
]

const tvMovieRates = [
  { work: 'TV movie script with outline required', fee: '$53,682' },
  { work: 'Script from existing story/outline, no outline stage', fee: '$42,945' },
  { work: 'Story / screen story', fee: '$10,739' },
  { work: 'Rewrite', fee: '$18,787' },
  { work: 'Polish', fee: '$9,665' },
  { work: 'Optional third draft after full script', fee: '$12,587' },
]

const producerCosts = [
  { item: 'Producer insurance contribution', value: '5% of gross fees for WGC members' },
  { item: 'Producer retirement contribution', value: '7% of gross fees for WGC members' },
  { item: 'Non-member equalization', value: '12% producer contribution for non-member writers/story editors' },
  { item: 'Writer retirement deduction', value: '3% from writer gross fees' },
  { item: 'WGC dues deduction', value: '2% for WGC members; 5% for non-members/designated non-members' },
  { item: 'CMPA member admin fee', value: '2% to WGC, capped at $1,000 per production/episode' },
  { item: 'CMPA association fee', value: '2.75%, capped at $2,850 per production or $1,900 per series episode' },
  { item: 'Non-CMPA member admin fee', value: '8% uncapped to WGC' },
]

const developmentRules = [
  'Article B2 is the clean lane for Development Proposal, Concept and/or Bible work before a script/story/treatment is contracted.',
  'B2 contracts can specify source idea, who created/provided it, fee, ownership or producer license, Created by/other credit, and ongoing obligations.',
  'If a WGC member is contracted to write a Bible, contract them under the IPA.',
  'If asking for a pilot or episode script, treat it as a script deal, not pitch/deck development.',
  'More than three stages plus a polish requires an added fee.',
  'After treatment, outline, or first draft delivery, producer response is due within 30 days; silence can be deemed acceptance and trigger the next stage.',
  'After second draft or optional third draft, further revisions require a negotiated fee.',
  'No rewrite by another writer until the original writer has been paid 100% of the relevant script-fee portion, or the grievance path has escalated.',
  'If a production executive/employee claims story credit, credit arbitration can apply. Flag Philip/Allan originator-credit scenarios for Tara.',
  'For qualifying productions: two Story Editors during the bulk of principal photography for one-hour budgets over $2.5M/episode and half-hour budgets over $1.5M/episode.',
  'AI materials must be disclosed and papered in covered scenarios; AI cannot reduce writer credit or compensation.',
]

export const dynamic = 'force-dynamic'

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-[#E4E7EC] rounded-2xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E4E7EC]">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  )
}

export default function UnionCheatSheetPage() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Union Cheat Sheet</h1>
          <p className="text-slate-500 mt-1">
            WGC Canada hard facts for TV development. 2026 rates only. Tara/business affairs controls on live deals.
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-[#ECFDF3] text-[#027A48] text-sm font-semibold border border-[#ABEFC6]">
          WGC 2026
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Half-hour pilot floor</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">$15,819</p>
          <p className="mt-1 text-sm text-slate-500">150% of the 2026 half-hour script-with-outline minimum.</p>
        </div>
        <div className="bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">One-hour pilot floor</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">$31,632</p>
          <p className="mt-1 text-sm text-slate-500">150% of the 2026 one-hour script-with-outline minimum.</p>
        </div>
        <div className="bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Development lane</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">B2</p>
          <p className="mt-1 text-sm text-slate-500">Use for pitch/deck/concept/bible work before script engagement.</p>
        </div>
      </div>

      <SectionCard title="Article C4 - TV Series Script Minimums">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E4E7EC] text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Work</th>
                <th className="py-2 px-4">30 min or less</th>
                <th className="py-2 px-4">60 min or less</th>
                <th className="py-2 pl-4">Development note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7EC]">
              {seriesRates.map((rate) => (
                <tr key={rate.work}>
                  <td className="py-3 pr-4 font-semibold text-slate-900">{rate.work}</td>
                  <td className="py-3 px-4 text-slate-700">{rate.halfHour}</td>
                  <td className="py-3 px-4 text-slate-700">{rate.hour}</td>
                  <td className="py-3 pl-4 text-slate-500">{rate.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionCard title="Article C3 - TV Movies / Mini-Series">
          <div className="space-y-3">
            {tvMovieRates.map((rate) => (
              <div key={rate.work} className="flex items-center justify-between gap-4 border-b border-[#F2F4F7] pb-3 last:border-b-0 last:pb-0">
                <span className="text-sm font-medium text-slate-700">{rate.work}</span>
                <span className="text-sm font-bold text-slate-900">{rate.fee}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Article B3 - Options">
          <ul className="space-y-3 text-sm text-slate-700">
            <li><strong>TV option fee:</strong> at least 10% per year of exercise fee, prorated if needed.</li>
            <li><strong>Exercise fee:</strong> at least the minimum script fee for the material at its stage.</li>
            <li><strong>Maximum option term:</strong> 5 years including renewals.</li>
            <li><strong>Deductibility:</strong> only option fees paid for the first 18 months are deductible from exercise fee.</li>
            <li><strong>Short option:</strong> 3 months or less is negotiable and not necessarily subject to full B3 structure.</li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Producer Costs / Deductions">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {producerCosts.map((cost) => (
            <div key={cost.item} className="border border-[#E4E7EC] rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{cost.item}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{cost.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Development Rules Philip Should Know">
        <ul className="space-y-3 text-sm text-slate-700">
          {developmentRules.map((rule) => (
            <li key={rule} className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-[#2563EB] shrink-0" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <p className="text-xs text-slate-400">
        Source basis: WGC/CMPA IPA 2024-2027 Articles B1, B2, B3, C3, C4, A12, and A13. Amounts shown are 2026 CAD figures only.
      </p>
    </div>
  )
}
