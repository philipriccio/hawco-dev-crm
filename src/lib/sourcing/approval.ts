// Independent business-brief authority; never grants or inherits legal access.
export function canApproveSourcingBrief(actor: { id: string }): boolean {
 const ownerId = process.env.SOURCING_PHILIP_USER_ID?.trim()
 return Boolean(ownerId && actor.id === ownerId)
}
