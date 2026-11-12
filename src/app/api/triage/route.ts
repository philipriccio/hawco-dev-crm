import {NextRequest,NextResponse} from 'next/server'
import {prisma} from '@/lib/db'
import {requireApiAuth,isAuthResponse} from '@/lib/api-auth'
import {applyTriage,TriageError} from '@/lib/triage'
export async function POST(request:NextRequest){
 const actor=await requireApiAuth();if(isAuthResponse(actor))return actor
 const origin=request.headers.get('origin');let sameOrigin=false;try { const source=new URL(origin||'');sameOrigin=['http:','https:'].includes(source.protocol)&&source.host===request.headers.get('host')&&source.origin===origin } catch {}
 if(!sameOrigin)return NextResponse.json({error:'Invalid request origin'},{status:403})
 try{
  const raw=await request.text();if(raw.length>8192)return NextResponse.json({error:'Request too large'},{status:413})
  return NextResponse.json(await applyTriage(prisma,JSON.parse(raw),{id:actor.id,name:actor.name}))
 }catch(error){if(error instanceof TriageError)return NextResponse.json({error:error.message},{status:error.status});if(error instanceof SyntaxError)return NextResponse.json({error:'Invalid JSON'},{status:400});console.error('Triage failed');return NextResponse.json({error:'Could not save. No changes were committed; retry.'},{status:500})}
}
