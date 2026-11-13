import assert from 'node:assert/strict'
import {emptyClassification,parseClassification,classificationLabel,hasClassificationFields,formats,engines,genres} from '../src/lib/classification/domain'
assert.deepEqual(parseClassification(emptyClassification),emptyClassification)
for(const [key,values] of Object.entries({standardizedFormat:formats,narrativeEngine:engines,primaryGenre:genres,secondaryGenre:genres})){
 for(const value of values)assert.equal(parseClassification({...emptyClassification,[key]:value})[key as keyof typeof emptyClassification],value)
 for(const bad of ['Hybrid','procedural','nonsense',{},42,undefined])assert.throws(()=>parseClassification({...emptyClassification,[key]:bad}))
}
assert.equal(classificationLabel('HALF_HOUR_COMEDY'),'Half-hour comedy')
assert.equal(classificationLabel(null),'Not recorded')
assert.equal(parseClassification({...emptyClassification,descriptorTags:Array.from({length:150},(_,i)=>'tag '+i)}).descriptorTags.length,150)
assert.deepEqual(parseClassification({...emptyClassification,descriptorTags:[' sexy ','sexy','Sexy']}).descriptorTags,['sexy','Sexy'])
for(const bad of ['',{},[''],['a'.repeat(201)],Array(200).fill('a'.repeat(200))])assert.throws(()=>parseClassification({...emptyClassification,descriptorTags:bad}))
assert.equal(hasClassificationFields({genre:'Legacy'}),false);assert.equal(hasClassificationFields({primaryGenre:'WRONG'}),true)
console.log('Classification validation: enums, unknowns, tags payload, legacy detection passed')
