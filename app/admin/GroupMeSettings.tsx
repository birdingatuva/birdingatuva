'use client'

import { useEffect, useState } from 'react'
import { CloudinaryImage } from '@/components/cloudinary-image'
import { Button } from '@/components/ui/button'
import { GroupMeTemplateEditor } from '@/components/groupme-template-editor'
import { normalizeGroupMeTemplate, validateGroupMeTemplate } from '@/lib/groupme'

export function GroupMeSettings() {
  const [template, setTemplate] = useState('')
  const [saved, setSaved] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [destination, setDestination] = useState('GroupMe')
  const [configured, setConfigured] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  useEffect(() => {
    let active = true
    fetch('/api/admin/groupme', { cache: 'no-store' }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load settings.')
      if (active) { setTemplate(normalizeGroupMeTemplate(typeof data.template === 'string' ? data.template : '')); setSaved(normalizeGroupMeTemplate(typeof data.template === 'string' ? data.template : '')); setConfigured(data.configured); setDestination(data.destination || 'GroupMe'); setLoaded(true) }
    }).catch(error => { if (active) setError(error.message) })
    return () => { active = false }
  }, [])
  async function save() {
    setSaving(true); setError(''); setStatus('')
    try {
      const response = await fetch('/api/admin/groupme', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save settings.')
      setSaved(template); setStatus('Default GroupMe message saved.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save settings.') }
    finally { setSaving(false) }
  }
  const value = template
  const validation = loaded ? validateGroupMeTemplate(value) : null
  return <div className="space-y-4">
    <h3 className="flex items-center gap-3 text-xl font-semibold">
      <CloudinaryImage src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'}/image/upload/home-page/groupme`} alt="" width={32} height={32} className="h-8 w-8 object-contain" />
      Default GroupMe message
    </h3>
    <p className="text-sm text-muted-foreground">Send announcements as the connected account to the <strong>{destination.split(" · ")[0]}</strong> channel in the <strong>{destination.split(" · ").slice(1).join(" · ") || destination}</strong> GroupMe from any published event page.</p>
    {!loaded && !error && <p role="status">Loading GroupMe settings...</p>}
    {loaded && <>
      <>{!configured && <p className="text-sm">Account setup needed: add GROUPME_ACCESS_TOKEN and GROUPME_TOPIC_ID to the server environment and redeploy.</p>}</>
      <p className="text-sm text-muted-foreground">This default message is used for events without a custom message. You can tweak it on each event page, including in preview mode.</p>
      <GroupMeTemplateEditor value={value} disabled={saving} onChange={value => { setTemplate(value); setStatus('') }} />
      {validation && <p role="alert" className="text-sm text-destructive">{validation}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={saving || !!validation || value === saved} onClick={save}>{saving ? 'Saving...' : 'Save default message'}</Button>
      </div>
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {status && <p role="status" className="text-sm">{status}</p>}
  </div>
}
