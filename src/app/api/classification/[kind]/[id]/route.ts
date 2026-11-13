import { requireApiAuth,isAuthResponse } from '@/lib/api-auth'
import { readMutation,response,failure } from '@/lib/sourcing/http'
import { ClassificationError } from '@/lib/classification/domain'
import { saveClassification } from '@/lib/classification/service'
export async function PATCH(request:Request,{params}:{params:Promise<{kind:string;id:string}>}) {
 const actor=await requireApiAuth();if(isAuthResponse(actor))return actor
 try {const {kind,id}=await params;return response(await saveClassification(kind,id,await readMutation(request),actor))}
 catch(e){if(e instanceof ClassificationError)return response({error:e.message},e.status);return failure(e)}
}
