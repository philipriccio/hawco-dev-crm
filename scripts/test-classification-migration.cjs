const assert=require('node:assert/strict'),fs=require('node:fs'),{PrismaClient}=require('@prisma/client')
const u=new URL(process.env.DATABASE_URL||'postgresql://invalid/');assert.ok(['localhost','127.0.0.1'].includes(u.hostname)&&u.pathname==='/hawco_sourcing_dev_20261112')
const db=new PrismaClient(),fields=['standardizedFormat','narrativeEngine','primaryGenre','secondaryGenre','descriptorTags'],types=['SlateFormat','NarrativeEngine','SlateGenre','PipelineStage']
async function main(){try{await db.$transaction(async tx=>{
 const snapshot=async()=>{const rows={};for(const table of ['Project','SourcingLead','IpProperty']){const omit=[...fields,...(table==='Project'?['pipelineStage']:[])].map(x=>"'"+x+"'").join(',');rows[table]=await tx.$queryRawUnsafe(`SELECT to_jsonb(t) - ARRAY[${omit}] AS row FROM "${table}" t ORDER BY id`)}return rows}
 const before=await snapshot()
 for(const table of ['Project','SourcingLead','IpProperty'])await tx.$executeRawUnsafe(`ALTER TABLE "${table}" ${[...fields,...(table==='Project'?['pipelineStage']:[])].map(f=>`DROP COLUMN "${f}"`).join(',')}`)
 for(const type of types)await tx.$executeRawUnsafe(`DROP TYPE "${type}"`)
 for(const statement of fs.readFileSync('prisma/migrations/20261113163000_classification/migration.sql','utf8').split(';').filter(s=>s.trim()))await tx.$executeRawUnsafe(statement)
 assert.deepEqual(await snapshot(),before,'All original columns/rows survive migration')
 for(const table of ['Project','SourcingLead','IpProperty'])assert.equal(Number((await tx.$queryRawUnsafe(`SELECT count(*) n FROM "${table}" WHERE "primaryGenre" IS NOT NULL OR cardinality("descriptorTags") > 0`))[0].n),0,'No classification inference')
 throw new Error('ROLLBACK_REHEARSAL_COMPLETE')
 })}catch(e){if(e.message!=='ROLLBACK_REHEARSAL_COMPLETE')throw e}console.log('Migration rehearsal passed: populated legacy rows unchanged; classifications unknown; rollback preserves fixture state')}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect())
