export const inputClass = 'w-full min-w-0 rounded border border-slate-300 bg-white px-3 py-2 text-slate-900'
export const buttonClass = 'rounded bg-[#224b66] px-4 py-2 text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2'
export const panelClass = 'rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4'
export const label = (s: string) => s.toLowerCase().replaceAll('_',' ').replace(/^./,c=>c.toUpperCase())
