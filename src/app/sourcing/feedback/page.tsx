import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { getSourcingFeedback } from '@/lib/sourcing/feedback'
import { panelClass, label } from '../styles'
export const dynamic = 'force-dynamic'
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 await requireAuth()
 const params = await searchParams, page = Math.floor(Math.max(0,Math.min(100000,Number(params.page)||0)))
 const {feedback,total} = await getSourcingFeedback(page)
 return <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8"><Link href="/sourcing" className="underline">← Sourcing</Link><h1 className="text-3xl font-semibold">Your sourcing feedback</h1><p>Notes you added when clearing suggestions, retained even if you restore them. These provide context for future research; they don’t automatically change the wanted list or exclude a whole genre or writer.</p><p>{total} note{total===1?'':'s'} · Page {page+1}</p>
 {feedback.length===0?<div className={panelClass}>No feedback notes on this page. You can add an optional note when clearing a suggestion.</div>:feedback.map(x=><article key={x.id} className={`${panelClass} min-w-0 break-words`}><h2 className="text-xl font-semibold"><Link className="underline" href={`/sourcing/${x.lead.id}`}>{x.lead.title}</Link></h2><p>{x.lead.creator} · {label(x.lead.kind)} · {x.lead.dismissedAt?'Currently cleared':'Currently restored'}</p><p className="text-sm text-slate-600">{x.actorName} · {x.createdAt.toISOString().slice(0,16).replace('T',' ')} UTC</p><blockquote className="whitespace-pre-wrap border-l-2 border-slate-300 pl-3">{x.note}</blockquote></article>)}
 <nav aria-label="Feedback pages" className="flex gap-4">{page>0&&<Link className="underline" href={`/sourcing/feedback?page=${page-1}`}>Previous</Link>}{(page+1)*50<total&&<Link className="underline" href={`/sourcing/feedback?page=${page+1}`}>Next</Link>}</nav></main>
}
