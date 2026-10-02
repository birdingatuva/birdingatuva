'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { DEFAULT_GROUPME_TEMPLATE, GROUPME_DESTINATION, GROUPME_PLACEHOLDERS, validateGroupMeTemplate } from '@/lib/groupme'

export function GroupMeSettings() {
  const [template, setTemplate] = useState('')
  const [saved, setSaved] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  useEffect(() => {
    let active = true
    fetch('/api/admin/groupme', { cache: 'no-store' }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load settings.')
      if (active) { setTemplate(data.template); setSaved(data.template); setConfigured(data.configured); setLoaded(true) }
    }).catch(error => { if (active) setError(error.message) })
    return () => { active = false }
  }, [])
  async function save() {
    setSaving(true); setError(''); setStatus('')
    try {
      const response = await fetch('/api/admin/groupme', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save settings.')
      setSaved(template); setStatus('GroupMe template saved.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save settings.') }
    finally { setSaving(false) }
  }
  const validation = loaded ? validateGroupMeTemplate(template) : null
  return <div className="space-y-4">
    <h3 className="text-xl font-semibold">GroupMe trip announcements</h3>
    <p className="text-sm text-muted-foreground">This template applies to every trip. Send announcements as the connected account to {GROUPME_DESTINATION} from each published event page. Saving or editing an event does not send a message.</p>
    {!loaded && !error && <p role="status">Loading GroupMe settings...</p>}
    {loaded && <>
      <p className="text-sm">{configured ? 'Account token configured. Any authorized site admin can send as this account.' : 'Account setup needed: add GROUPME_ACCESS_TOKEN to the server environment and redeploy.'}</p>
      <label htmlFor="groupme-template" className="block text-sm font-medium">Message template</label>
      <Textarea id="groupme-template" rows={8} value={template} disabled={saving} onChange={event => { setTemplate(event.target.value); setStatus('') }} />
      <p className="text-sm text-muted-foreground">Placeholders: {GROUPME_PLACEHOLDERS.map(key => `{{${key}}}`).join(', ')}. Times are Eastern. Include the event URL. The completed message must fit within 1,000 characters.</p>
      {validation && <p role="alert" className="text-sm text-destructive">{validation}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={saving || !!validation || template === saved} onClick={save}>{saving ? 'Saving...' : 'Save GroupMe template'}</Button>
        <Button type="button" variant="outline" disabled={saving} onClick={() => { setTemplate(DEFAULT_GROUPME_TEMPLATE); setStatus('') }}>Use default template</Button>
      </div>
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {status && <p role="status" className="text-sm">{status}</p>}
  </div>
}
