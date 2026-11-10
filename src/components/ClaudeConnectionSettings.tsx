 'use client'
import { useState } from 'react'
export default function ClaudeConnectionSettings() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    setBusy(true); setResult('')
    try {
      const response = await fetch('/api/settings/claude-connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(fields)) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save passphrase.')
      form.reset()
      setResult('Passphrase saved. Use it when reconnecting Claude. Existing Claude connections and your website password are unchanged.')
    } catch (error) { setResult(error instanceof Error ? error.message : 'Could not save passphrase. Check your connection and try again.') }
    finally { setBusy(false) }
  }
  return <section className="bg-white rounded-xl border border-slate-200 p-6">
    <h2 className="text-lg font-semibold text-slate-900 mb-2">Claude connection passphrase</h2>
    <p className="text-sm text-slate-600 mb-4">Set a separate passphrase for connecting Claude to Hawco CRM. You do not need the old connection passphrase. Save the new one in your password manager. Changing it does not sign out existing connections.</p>
    <form onSubmit={save} className="space-y-4">
      <fieldset disabled={busy} className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">Current website password<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={256} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium text-slate-700">New Claude connection passphrase<input name="passphrase" type="password" autoComplete="new-password" required minLength={16} maxLength={128} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium text-slate-700">Confirm new passphrase<input name="confirmation" type="password" autoComplete="new-password" required minLength={16} maxLength={128} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <p className="text-sm text-slate-600">16–128 characters. No leading or trailing spaces. Use a different value from your website password.</p>
        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save Claude passphrase'}</button>
      </fieldset>
      <p role="status" aria-live="polite" className="text-sm text-slate-800 break-words">{result}</p>
    </form>
  </section>
}
