type Version = { id: string; familyId: string | null; supersedesId: string | null }
export function validateVersionLink(materials: Version[], materialId: string, familyName: string, supersedesId: string | null) {
      const material = materials.find(m => m.id === materialId)
      if (!material) throw new Error('Material is not linked to this project')
      const familyId = familyName.trim()
      const parent = supersedesId ? materials.find(m => m.id === supersedesId) : null
      if (supersedesId && (!parent || parent.id === material.id || parent.familyId !== familyId)) throw new Error('Superseded material must be a different version in the same project and family')
      const descendants = materials.filter(m => m.supersedesId === material.id)
      if (descendants.some(m => m.familyId !== familyId)) throw new Error('Keep linked versions in the same family')
      let cursor = parent; const seen = new Set([material.id])
      while (cursor) { if (seen.has(cursor.id)) throw new Error('Version chain cannot contain a cycle'); seen.add(cursor.id); cursor = materials.find(m => m.id === cursor?.supersedesId) || null }
      return { material, familyId }
}
