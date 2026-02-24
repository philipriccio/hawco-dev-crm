'use client'

import { useRouter } from 'next/navigation'

interface DeleteContactButtonProps {
  contactId: string
  contactName: string
}

export default function DeleteContactButton({ contactId, contactName }: DeleteContactButtonProps) {
  const router = useRouter()

  const handleDelete = async () => {
    const confirmMessage = `Are you sure you want to delete "${contactName}"?`
    if (!confirm(confirmMessage)) return
    
    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Failed to delete contact')
      router.push('/contacts')
    } catch (error) {
      console.error('Error deleting contact:', error)
      alert('Failed to delete contact')
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium w-full"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Delete Contact
    </button>
  )
}