'use client'
import FollowUpWidget, { type FollowUpItem } from './FollowUpWidget'
export default function ContactFollowUps({ contactId, initialFollowUps }: { contactId: string; initialFollowUps: FollowUpItem[] }) {
  return <FollowUpWidget contactId={contactId} initialFollowUps={initialFollowUps} />
}
