'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GroupMeTemplateEditor } from '@/components/groupme-template-editor'
import { normalizeSmsTemplate, validateSmsTemplate } from '@/lib/sms-template'

export function SmsSettings() {
  const [template, setTemplate] = useState('')
  const [saved, setSaved] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const lock = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/sms', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load SMS settings.')
      if (!controller.signal.aborted) {
        const value = normalizeSmsTemplate(data.template)
        setTemplate(value); setSaved(value); setLoaded(true)
      }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [])
  const validation = loaded ? validateSmsTemplate(template) : null
  async function save() {
    if (lock.current || !loaded || validation || template === saved) return
    lock.current = true; setSaving(true); setError(''); setStatus('')
    try {
      const response = await fetch('/api/admin/sms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save SMS settings.')
      setTemplate(data.template); setSaved(data.template); setStatus('Default SMS message saved.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save SMS settings.') }
    finally { lock.current = false; setSaving(false) }
  }
  return <section className="space-y-4" aria-label="Default event SMS template">
    <h3 className="flex items-center gap-3 text-xl font-semibold"><MessageCircle aria-hidden="true" className="h-8 w-8 text-primary" />Default SMS message</h3>
    <p className="text-sm text-muted-foreground">Autofills when you open an event’s group text composer. You can edit the message before opening your messaging app.</p>
    {!loaded && !error && <p role="status">Loading SMS settings…</p>}
    {loaded && <>
      <GroupMeTemplateEditor label="Default event SMS template" value={template} disabled={saving} onChange={value => { setTemplate(value); setStatus('') }} />
      {validation && <p role="alert" className="text-sm text-destructive">{validation}</p>}
      <Button type="button" disabled={saving || !!validation || template === saved} onClick={save}>{saving ? 'Saving…' : 'Save default SMS message'}</Button>
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {status && <p role="status" className="text-sm">{status}</p>}
  </section>
}
