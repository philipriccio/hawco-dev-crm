import { NextResponse } from 'next/server'
import { SourcingError } from './domain'
export const response = (v: unknown, status = 200) => NextResponse.json(v,{status,headers:{'Cache-Control':'private, no-store'}})
export function failure(e: unknown) {
 if(e instanceof SourcingError) return response({error:e.message},e.status)
 if(e && typeof e === 'object' && 'code' in e) {
  if(['P2002','P2034'].includes(String(e.code))) return response({error:'Duplicate lead or concurrent change. Reload and check existing records before retrying.'},409)
  if(String(e.code) === 'P2003') return response({error:'A linked contact, project or IP no longer exists. Reload before retrying.'},400)
 }
 return response({error:'Could not confirm this operation. Reload before retrying; no success is assumed.'},503)
}
export async function readMutation(request: Request) {
 try { const origin = request.headers.get('origin'); if(!origin || new URL(origin).host !== request.headers.get('host') || request.headers.get('sec-fetch-site') === 'cross-site') throw Error() } catch { throw new SourcingError('Forbidden origin',403) }
 if(!request.headers.get('content-type')?.startsWith('application/json')) throw new SourcingError('JSON required',415)
 const raw = await request.text()
 if(raw.length > 100000) throw new SourcingError('Request too large',413)
 try { return JSON.parse(raw) as unknown } catch { throw new SourcingError('Invalid JSON') }
}
